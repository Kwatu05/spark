// Simple A/B testing system with localStorage persistence
export interface Experiment {
  id: string;
  name: string;
  variants: string[];
  trafficAllocation: number; // 0-1, percentage of users who see this experiment
}

export interface ExperimentAssignment {
  experimentId: string;
  variant: string;
  assignedAt: number;
}

// Define experiments
export const EXPERIMENTS: Experiment[] = [
  {
    id: 'onboarding_flow',
    name: 'Onboarding Flow',
    variants: ['control', 'simplified'],
    trafficAllocation: 0.5, // 50% of users
  },
  {
    id: 'feed_layout',
    name: 'Feed Layout',
    variants: ['grid', 'list'],
    trafficAllocation: 0.3, // 30% of users
  },
  {
    id: 'cta_button',
    name: 'CTA Button Text',
    variants: ['spark', 'connect'],
    trafficAllocation: 0.8, // 80% of users
  },
];

// Generate consistent hash for user
const hashUserId = (userId: string): number => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

// Assign user to experiment variant
export const assignToExperiment = (experimentId: string, userId?: string): string | null => {
  const experiment = EXPERIMENTS.find(e => e.id === experimentId);
  if (!experiment) return null;

  // Check if already assigned
  const existing = getExperimentAssignment(experimentId);
  if (existing) return existing.variant;

  // Generate user ID for assignment (use provided or generate)
  const assignmentUserId = userId || `anon_${Date.now()}_${Math.random()}`;
  const hash = hashUserId(assignmentUserId);
  
  // Check if user should be in experiment (traffic allocation)
  const shouldBeInExperiment = (hash % 100) < (experiment.trafficAllocation * 100);
  if (!shouldBeInExperiment) return null;

  // Assign to variant
  const variantIndex = hash % experiment.variants.length;
  const variant = experiment.variants[variantIndex];

  // Store assignment
  const assignment: ExperimentAssignment = {
    experimentId,
    variant,
    assignedAt: Date.now(),
  };

  try {
    const assignments = getStoredAssignments();
    assignments[experimentId] = assignment;
    localStorage.setItem('ab_assignments', JSON.stringify(assignments));
  } catch (error) {
    console.warn('Failed to store experiment assignment:', error);
  }

  return variant;
};

// Get experiment assignment
export const getExperimentAssignment = (experimentId: string): ExperimentAssignment | null => {
  try {
    const assignments = getStoredAssignments();
    return assignments[experimentId] || null;
  } catch {
    return null;
  }
};

// Get all stored assignments
const getStoredAssignments = (): Record<string, ExperimentAssignment> => {
  try {
    const stored = localStorage.getItem('ab_assignments');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Track event for analytics
export const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  const userId = localStorage.getItem('spark_session') ? 'authenticated' : 'anonymous';
  
  const event = {
    event: eventName,
    properties: {
      ...properties,
      userId,
      timestamp: Date.now(),
      experiments: getActiveExperiments(),
    },
  };

  // Send to backend
  try {
    await fetch('/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.warn('Failed to track event:', error);
  }

  // Also log locally for debugging
  console.log('Analytics Event:', event);
};

// Get active experiments for current user
export const getActiveExperiments = (): Record<string, string> => {
  const assignments = getStoredAssignments();
  const active: Record<string, string> = {};
  
  Object.values(assignments).forEach(assignment => {
    active[assignment.experimentId] = assignment.variant;
  });
  
  return active;
};

// Initialize experiments for user
export const initializeExperiments = (userId?: string) => {
  EXPERIMENTS.forEach(experiment => {
    assignToExperiment(experiment.id, userId);
  });
};
