import { api } from './api';

export interface UserSuggestion {
  id: string;
  name: string;
  age: number;
  bio: string;
  location: string;
  profession: string;
  avatar: string;
  interests: string[];
  connectionPreference: string;
  isVerified: boolean;
  matchScore: number;
  matchReasons: string[];
}

export interface SuggestionFilters {
  ageRange?: [number, number];
  location?: string;
  interests?: string[];
  connectionPreference?: string;
  verifiedOnly?: boolean;
}

export class SuggestionService {
  /**
   * Get user suggestions based on similar interests and preferences
   */
  static async getSuggestions(
    currentUserId: string,
    filters: SuggestionFilters = {},
    limit: number = 20
  ): Promise<UserSuggestion[]> {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(filters.ageRange && { 
          minAge: filters.ageRange[0].toString(),
          maxAge: filters.ageRange[1].toString()
        }),
        ...(filters.location && { location: filters.location }),
        ...(filters.interests && { interests: filters.interests.join(',') }),
        ...(filters.connectionPreference && { connectionPreference: filters.connectionPreference }),
        ...(filters.verifiedOnly && { verifiedOnly: 'true' })
      });

      const response = await api.get<{ok: boolean; suggestions: any[]}>(
        `/users/suggestions?${queryParams.toString()}`
      );

      if (response.ok && Array.isArray(response.suggestions)) {
        return response.suggestions.map((user: any) => ({
          id: user.id,
          name: user.name,
          age: user.age,
          bio: user.bio || '',
          location: user.location || '',
          profession: user.profession || '',
          avatar: user.avatar || 'https://placehold.co/64',
          interests: user.interests || [],
          connectionPreference: user.connectionPreference || '',
          isVerified: user.isVerified || false,
          matchScore: user.matchScore || 0,
          matchReasons: user.matchReasons || []
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      return [];
    }
  }

  /**
   * Get trending interests based on user activity
   */
  static async getTrendingInterests(): Promise<string[]> {
    try {
      const response = await api.get<{ok: boolean; interests: string[]}>('/users/trending-interests');
      return response.ok ? response.interests : [];
    } catch (error) {
      console.error('Failed to fetch trending interests:', error);
      return [];
    }
  }

  /**
   * Get location-based suggestions
   */
  static async getNearbyUsers(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    limit: number = 20
  ): Promise<UserSuggestion[]> {
    try {
      const response = await api.get<{ok: boolean; suggestions: any[]}>(
        `/users/nearby?lat=${latitude}&lng=${longitude}&radius=${radiusKm}&limit=${limit}`
      );

      if (response.ok && Array.isArray(response.suggestions)) {
        return response.suggestions.map((user: any) => ({
          id: user.id,
          name: user.name,
          age: user.age,
          bio: user.bio || '',
          location: user.location || '',
          profession: user.profession || '',
          avatar: user.avatar || 'https://placehold.co/64',
          interests: user.interests || [],
          connectionPreference: user.connectionPreference || '',
          isVerified: user.isVerified || false,
          matchScore: user.matchScore || 0,
          matchReasons: user.matchReasons || []
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch nearby users:', error);
      return [];
    }
  }

  /**
   * Calculate match score between two users
   */
  static calculateMatchScore(
    user1Interests: string[],
    user2Interests: string[],
    user1Location?: string,
    user2Location?: string,
    user1Age?: number,
    user2Age?: number
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Interest matching (60% of score)
    const commonInterests = user1Interests.filter(interest => 
      user2Interests.includes(interest)
    );
    const interestScore = (commonInterests.length / Math.max(user1Interests.length, user2Interests.length)) * 60;
    score += interestScore;

    if (commonInterests.length > 0) {
      reasons.push(`Share ${commonInterests.length} interest${commonInterests.length > 1 ? 's' : ''}: ${commonInterests.slice(0, 3).join(', ')}`);
    }

    // Location matching (20% of score)
    if (user1Location && user2Location) {
      const location1 = user1Location.toLowerCase();
      const location2 = user2Location.toLowerCase();
      
      if (location1 === location2) {
        score += 20;
        reasons.push('Same location');
      } else if (location1.includes(location2.split(',')[0]) || location2.includes(location1.split(',')[0])) {
        score += 10;
        reasons.push('Nearby location');
      }
    }

    // Age compatibility (20% of score)
    if (user1Age && user2Age) {
      const ageDiff = Math.abs(user1Age - user2Age);
      if (ageDiff <= 2) {
        score += 20;
        reasons.push('Similar age');
      } else if (ageDiff <= 5) {
        score += 10;
        reasons.push('Compatible age');
      }
    }

    return { score: Math.round(score), reasons };
  }
}
