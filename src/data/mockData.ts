import { User, Post } from '../App';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Emma Thompson',
    age: 28,
    bio: 'Adventure seeker with a passion for hiking and photography. Love discovering hidden gems in the city and sharing stories over good coffee. Looking for genuine connections.',
    location: 'London, UK',
    profession: 'Graphic Designer',
    avatar: 'https://images.pexels.com/photos/3777931/pexels-photo-3777931.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    connectionPreference: 'Long-term',
    interests: ['Hiking', 'Photography', 'Coffee', 'Travel', 'Art', 'Yoga'],
    posts: [],
    isVerified: true
  },
  {
    id: '2',
    name: 'James Wilson',
    age: 31,
    bio: 'Chef by day, foodie by night. Always experimenting with new recipes and exploring local food scenes. Wine enthusiast and weekend warrior.',
    location: 'Manchester, UK',
    profession: 'Head Chef',
    avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    connectionPreference: 'Short-term',
    interests: ['Cooking', 'Wine', 'Food', 'Travel', 'Jazz', 'Cycling'],
    posts: [],
    isVerified: false
  },
  {
    id: '3',
    name: 'Sofia Rodriguez',
    age: 26,
    bio: 'Marketing professional with a love for dance and live music. Always up for trying new restaurants and exploring different cultures through food and art.',
    location: 'Birmingham, UK',
    profession: 'Marketing Manager',
    avatar: 'https://images.pexels.com/photos/3778876/pexels-photo-3778876.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    connectionPreference: 'Friends',
    interests: ['Dancing', 'Music', 'Food', 'Culture', 'Marketing', 'Festivals'],
    posts: [],
    isVerified: true
  },
  {
    id: '4',
    name: 'Alex Chen',
    age: 29,
    bio: 'Tech entrepreneur who loves rock climbing and sustainable living. Passionate about innovation and making a positive impact on the world.',
    location: 'Edinburgh, UK',
    profession: 'Software Engineer',
    avatar: 'https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    connectionPreference: 'Long-term',
    interests: ['Rock Climbing', 'Technology', 'Sustainability', 'Startups', 'Fitness', 'Reading'],
    posts: [],
    isVerified: true
  },
  {
    id: '5',
    name: 'Maya Patel',
    age: 25,
    bio: 'Yoga instructor and wellness coach. Love connecting mind, body, and spirit through mindful practices. Always seeking adventure and authentic experiences.',
    location: 'Bristol, UK',
    profession: 'Yoga Instructor',
    avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    connectionPreference: 'Long-term',
    interests: ['Yoga', 'Meditation', 'Wellness', 'Nature', 'Spirituality', 'Healthy Living'],
    posts: [],
    isVerified: false
  },
  {
    id: '6',
    name: 'Daniel Foster',
    age: 33,
    bio: 'Architect with a passion for design and urban exploration. Love discovering the stories buildings tell and creating spaces that inspire.',
    location: 'Glasgow, UK',
    profession: 'Architect',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    connectionPreference: 'Short-term',
    interests: ['Architecture', 'Design', 'Urban Exploration', 'History', 'Art', 'Photography'],
    posts: [],
    isVerified: true
  }
];

export const mockPosts: Post[] = [
  {
    id: '1',
    userId: '1',
    user: mockUsers[0],
    type: 'photo',
    content: ['https://images.pexels.com/photos/1365425/pexels-photo-1365425.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop'],
    caption: 'Perfect morning hike to start the weekend! The view from the top was absolutely breathtaking. Nothing beats that feeling of accomplishment after a challenging climb 🏔️',
    activityTags: ['Hiking', 'Outdoors', 'Weekend'],
    likes: 127,
    isLiked: false,
    timestamp: '2 hours ago',
    location: 'Lake District, UK'
  },
  {
    id: '2',
    userId: '2',
    user: mockUsers[1],
    type: 'photo',
    content: ['https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop'],
    caption: 'Experimenting with a new pasta recipe tonight! Sometimes the best discoveries happen when you step out of your comfort zone in the kitchen 👨‍🍳',
    activityTags: ['Cooking', 'Food', 'Homemade'],
    likes: 89,
    isLiked: true,
    timestamp: '4 hours ago',
    location: 'Home Kitchen'
  },
  {
    id: '3',
    userId: '3',
    user: mockUsers[2],
    type: 'photo',
    content: ['https://images.pexels.com/photos/1708936/pexels-photo-1708936.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop'],
    caption: 'Found this amazing little jazz bar in the city center. The atmosphere is incredible and the music just speaks to your soul 🎷✨',
    activityTags: ['Music', 'Jazz', 'Nightlife'],
    likes: 156,
    isLiked: false,
    timestamp: '6 hours ago',
    location: 'Birmingham City Center'
  },
  {
    id: '4',
    userId: '4',
    user: mockUsers[3],
    type: 'photo',
    content: ['https://images.pexels.com/photos/1431822/pexels-photo-1431822.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop'],
    caption: 'Rock climbing session this morning! There\'s something incredibly meditative about focusing entirely on the next hold. Mind and body in perfect sync 🧗‍♂️',
    activityTags: ['RockClimbing', 'Fitness', 'Mindfulness'],
    likes: 201,
    isLiked: true,
    timestamp: '8 hours ago',
    location: 'Edinburgh Climbing Centre'
  },
  {
    id: '5',
    userId: '5',
    user: mockUsers[4],
    type: 'photo',
    content: ['https://images.pexels.com/photos/317155/pexels-photo-317155.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop'],
    caption: 'Morning yoga session by the water. Starting the day with gratitude and intention. The sunrise today was absolutely magical 🌅🧘‍♀️',
    activityTags: ['Yoga', 'Sunrise', 'Meditation'],
    likes: 143,
    isLiked: false,
    timestamp: '1 day ago',
    location: 'Bristol Harbourside'
  },
  {
    id: '6',
    userId: '6',
    user: mockUsers[5],
    type: 'photo',
    content: ['https://images.pexels.com/photos/1797121/pexels-photo-1797121.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop'],
    caption: 'Exploring the architectural gems of the city. Every building has a story to tell, and I love discovering the details that make each one unique 🏛️',
    activityTags: ['Architecture', 'Photography', 'Urban'],
    likes: 178,
    isLiked: true,
    timestamp: '1 day ago',
    location: 'Glasgow City Centre'
  }
];