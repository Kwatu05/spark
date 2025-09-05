import { PrismaClient } from '@prisma/client';
import Fuse from 'fuse.js';
import { logInfo, logError, logWarning } from '../utils/logger';
import { cacheService } from './cache';

const prisma = new PrismaClient();

export interface SearchOptions {
  query: string;
  type?: 'all' | 'users' | 'posts' | 'comments';
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  filters?: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    location?: string;
    tags?: string[];
    verified?: boolean;
  };
}

export interface SearchResult {
  type: 'user' | 'post' | 'comment';
  id: string;
  title: string;
  description: string;
  relevance: number;
  metadata: any;
  createdAt: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  suggestions?: string[];
  filters?: any;
}

export class SearchService {
  private static instance: SearchService;
  private userFuse: Fuse<any> | null = null;
  private postFuse: Fuse<any> | null = null;
  private commentFuse: Fuse<any> | null = null;
  private searchIndex: Map<string, any> = new Map();
  private lastIndexUpdate: Date = new Date(0);

  private constructor() {
    this.initializeSearchIndexes();
  }

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Initialize search indexes
   */
  private async initializeSearchIndexes(): Promise<void> {
    try {
      await this.buildSearchIndexes();
      logInfo('Search indexes initialized');
    } catch (error) {
      logError('Failed to initialize search indexes', error as Error);
    }
  }

  /**
   * Build search indexes for all searchable content
   */
  async buildSearchIndexes(): Promise<void> {
    try {
      logInfo('Building search indexes...');

      // Build user index
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          location: true,
          profession: true,
          isVerified: true,
          createdAt: true
        }
      });

      this.userFuse = new Fuse(users, {
        keys: [
          { name: 'username', weight: 0.4 },
          { name: 'name', weight: 0.3 },
          { name: 'bio', weight: 0.2 },
          { name: 'location', weight: 0.1 }
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true
      });

      // Build post index
      const posts = await prisma.post.findMany({
        select: {
          id: true,
          caption: true,
          activityTags: true,
          location: true,
          type: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        }
      });

      this.postFuse = new Fuse(posts, {
        keys: [
          { name: 'caption', weight: 0.5 },
          { name: 'activityTags', weight: 0.3 },
          { name: 'location', weight: 0.1 },
          { name: 'user.name', weight: 0.1 }
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true
      });

      // Build comment index
      const comments = await prisma.comment.findMany({
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              isVerified: true
            }
          },
          post: {
            select: {
              id: true,
              caption: true
            }
          }
        }
      });

      this.commentFuse = new Fuse(comments, {
        keys: [
          { name: 'content', weight: 0.7 },
          { name: 'user.name', weight: 0.2 },
          { name: 'post.caption', weight: 0.1 }
        ],
        threshold: 0.4,
        includeScore: true,
        includeMatches: true
      });

      this.lastIndexUpdate = new Date();
      this.searchIndex.set('users', users);
      this.searchIndex.set('posts', posts);
      this.searchIndex.set('comments', comments);

      logInfo('Search indexes built successfully', {
        users: users.length,
        posts: posts.length,
        comments: comments.length
      });
    } catch (error) {
      logError('Failed to build search indexes', error as Error);
      throw error;
    }
  }

  /**
   * Perform search across all content types
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    try {
      const { query, type = 'all', limit = 20, offset = 0, sortBy = 'relevance', filters } = options;

      if (!query.trim()) {
        return {
          results: [],
          total: 0,
          page: Math.floor(offset / limit) + 1,
          limit,
          hasMore: false
        };
      }

      // Check if indexes need updating
      await this.updateIndexesIfNeeded();

      const results: SearchResult[] = [];
      let total = 0;

      // Search users
      if (type === 'all' || type === 'users') {
        const userResults = await this.searchUsers(query, filters);
        results.push(...userResults);
      }

      // Search posts
      if (type === 'all' || type === 'posts') {
        const postResults = await this.searchPosts(query, filters);
        results.push(...postResults);
      }

      // Search comments
      if (type === 'all' || type === 'comments') {
        const commentResults = await this.searchComments(query, filters);
        results.push(...commentResults);
      }

      // Sort results
      const sortedResults = this.sortResults(results, sortBy);

      // Apply pagination
      const paginatedResults = sortedResults.slice(offset, offset + limit);
      total = sortedResults.length;

      // Generate suggestions
      const suggestions = await this.generateSuggestions(query);

      logInfo('Search performed', {
        query,
        type,
        resultsCount: paginatedResults.length,
        total,
        sortBy
      });

      return {
        results: paginatedResults,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total,
        suggestions
      };
    } catch (error) {
      logError('Search failed', error as Error, { query: options.query, type: options.type });
      throw error;
    }
  }

  /**
   * Search users
   */
  private async searchUsers(query: string, filters?: any): Promise<SearchResult[]> {
    if (!this.userFuse) return [];

    const fuseResults = this.userFuse.search(query);
    
    return fuseResults
      .filter(result => {
        // Apply filters
        if (filters?.verified !== undefined && result.item.isVerified !== filters.verified) {
          return false;
        }
        if (filters?.location && !result.item.location?.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
        return true;
      })
      .map(result => ({
        type: 'user' as const,
        id: result.item.id,
        title: result.item.name || result.item.username,
        description: result.item.bio || `${result.item.profession || ''} ${result.item.location || ''}`.trim(),
        relevance: 1 - (result.score || 0),
        metadata: {
          username: result.item.username,
          isVerified: result.item.isVerified,
          location: result.item.location,
          profession: result.item.profession,
          matches: result.matches
        },
        createdAt: result.item.createdAt
      }));
  }

  /**
   * Search posts
   */
  private async searchPosts(query: string, filters?: any): Promise<SearchResult[]> {
    if (!this.postFuse) return [];

    const fuseResults = this.postFuse.search(query);
    
    return fuseResults
      .filter(result => {
        // Apply filters
        if (filters?.dateRange) {
          const postDate = new Date(result.item.createdAt);
          if (postDate < filters.dateRange.start || postDate > filters.dateRange.end) {
            return false;
          }
        }
        if (filters?.location && !result.item.location?.toLowerCase().includes(filters.location.toLowerCase())) {
          return false;
        }
        if (filters?.tags && filters.tags.length > 0) {
          const postTags = result.item.activityTags ? JSON.parse(result.item.activityTags) : [];
          const hasMatchingTag = filters.tags.some((tag: string) => 
            postTags.some((postTag: string) => postTag.toLowerCase().includes(tag.toLowerCase()))
          );
          if (!hasMatchingTag) return false;
        }
        return true;
      })
      .map(result => ({
        type: 'post' as const,
        id: result.item.id,
        title: result.item.caption.substring(0, 100) + (result.item.caption.length > 100 ? '...' : ''),
        description: `By ${result.item.user.name} • ${result.item._count.likes} likes • ${result.item._count.comments} comments`,
        relevance: 1 - (result.score || 0),
        metadata: {
          user: result.item.user,
          type: result.item.type,
          location: result.item.location,
          activityTags: result.item.activityTags ? JSON.parse(result.item.activityTags) : [],
          likes: result.item._count.likes,
          comments: result.item._count.comments,
          matches: result.matches
        },
        createdAt: result.item.createdAt
      }));
  }

  /**
   * Search comments
   */
  private async searchComments(query: string, filters?: any): Promise<SearchResult[]> {
    if (!this.commentFuse) return [];

    const fuseResults = this.commentFuse.search(query);
    
    return fuseResults
      .filter(result => {
        // Apply filters
        if (filters?.dateRange) {
          const commentDate = new Date(result.item.createdAt);
          if (commentDate < filters.dateRange.start || commentDate > filters.dateRange.end) {
            return false;
          }
        }
        return true;
      })
      .map(result => ({
        type: 'comment' as const,
        id: result.item.id,
        title: result.item.content.substring(0, 100) + (result.item.content.length > 100 ? '...' : ''),
        description: `Comment by ${result.item.user.name} on "${result.item.post.caption.substring(0, 50)}..."`,
        relevance: 1 - (result.score || 0),
        metadata: {
          user: result.item.user,
          post: result.item.post,
          matches: result.matches
        },
        createdAt: result.item.createdAt
      }));
  }

  /**
   * Sort search results
   */
  private sortResults(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'popularity':
        return results.sort((a, b) => {
          const aPopularity = (a.metadata.likes || 0) + (a.metadata.comments || 0);
          const bPopularity = (b.metadata.likes || 0) + (b.metadata.comments || 0);
          return bPopularity - aPopularity;
        });
      case 'relevance':
      default:
        return results.sort((a, b) => b.relevance - a.relevance);
    }
  }

  /**
   * Generate search suggestions
   */
  async generateSuggestions(query: string): Promise<string[]> {
    try {
      const suggestions: string[] = [];
      const queryLower = query.toLowerCase();

      // Get popular tags
      const popularTags = await this.getPopularTags();
      const matchingTags = popularTags.filter(tag => 
        tag.toLowerCase().includes(queryLower)
      ).slice(0, 3);
      suggestions.push(...matchingTags);

      // Get popular locations
      const popularLocations = await this.getPopularLocations();
      const matchingLocations = popularLocations.filter(location => 
        location.toLowerCase().includes(queryLower)
      ).slice(0, 2);
      suggestions.push(...matchingLocations);

      return suggestions.slice(0, 5);
    } catch (error) {
      logError('Failed to generate suggestions', error as Error);
      return [];
    }
  }

  /**
   * Get popular tags
   */
  private async getPopularTags(): Promise<string[]> {
    try {
      const posts = await prisma.post.findMany({
        select: { activityTags: true },
        where: {
          activityTags: { not: null }
        }
      });

      const tagCounts: Record<string, number> = {};
      posts.forEach(post => {
        if (post.activityTags) {
          const tags = JSON.parse(post.activityTags);
          tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([tag]) => tag);
    } catch (error) {
      logError('Failed to get popular tags', error as Error);
      return [];
    }
  }

  /**
   * Get popular locations
   */
  private async getPopularLocations(): Promise<string[]> {
    try {
      const locations = await prisma.post.groupBy({
        by: ['location'],
        where: {
          location: { not: null }
        },
        _count: {
          location: true
        },
        orderBy: {
          _count: {
            location: 'desc'
          }
        },
        take: 20
      });

      return locations.map(loc => loc.location).filter(Boolean) as string[];
    } catch (error) {
      logError('Failed to get popular locations', error as Error);
      return [];
    }
  }

  /**
   * Update indexes if needed
   */
  private async updateIndexesIfNeeded(): Promise<void> {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.lastIndexUpdate.getTime();
    const updateInterval = 5 * 60 * 1000; // 5 minutes

    if (timeSinceUpdate > updateInterval) {
      logInfo('Updating search indexes...');
      await this.buildSearchIndexes();
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(): Promise<any> {
    try {
      const totalUsers = await prisma.user.count();
      const totalPosts = await prisma.post.count();
      const totalComments = await prisma.comment.count();
      const popularTags = await this.getPopularTags();
      const popularLocations = await this.getPopularLocations();

      return {
        totalUsers,
        totalPosts,
        totalComments,
        popularTags: popularTags.slice(0, 10),
        popularLocations: popularLocations.slice(0, 10),
        lastIndexUpdate: this.lastIndexUpdate
      };
    } catch (error) {
      logError('Failed to get search analytics', error as Error);
      return {};
    }
  }

  /**
   * Clear search cache
   */
  async clearSearchCache(): Promise<void> {
    try {
      await cacheService.delPattern('search:*');
      logInfo('Search cache cleared');
    } catch (error) {
      logError('Failed to clear search cache', error as Error);
    }
  }

  /**
   * Rebuild search indexes
   */
  async rebuildIndexes(): Promise<void> {
    try {
      logInfo('Rebuilding search indexes...');
      await this.buildSearchIndexes();
      await this.clearSearchCache();
      logInfo('Search indexes rebuilt successfully');
    } catch (error) {
      logError('Failed to rebuild search indexes', error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const searchService = SearchService.getInstance();
