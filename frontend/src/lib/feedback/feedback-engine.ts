/**
 * Feedback Engine - Dynamic Form Generation
 * 
 * Generates context-aware feedback forms based on project metadata
 * Not hardcoded - adapts to user's actual usage patterns
 */

export interface ProjectContext {
  projectId: string;
  userId: string;
  rooms: Array<{
    id: string;
    name: string;
    type: string;
    hasMoodboard: boolean;
  }>;
  stagesUsed: string[]; // FLOOR_PLAN, INTENT, MOODBOARD, etc.
  regenerationCount: number;
  timeSpent?: number; // in minutes
  errorsOrRetries: number;
  selectedStyles?: string[];
  planType?: string;
  isSingleTheme: boolean;
}

export interface FeedbackFormSection {
  id: string;
  title: string;
  description?: string;
  fields: FeedbackField[];
  conditional?: (context: ProjectContext) => boolean;
}

export interface FeedbackField {
  id: string;
  type: 'rating' | 'dropdown' | 'toggle' | 'multi-select' | 'slider' | 'text' | 'emoji-scale' | 'ranking';
  label: string;
  description?: string;
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  defaultValue?: any;
  conditional?: (context: ProjectContext) => boolean;
}

export interface FeedbackData {
  projectId: string;
  userId: string;
  rooms: string[];
  ratings: Record<string, number | string>;
  aiEvaluation: Record<string, any>;
  improvementSignals: Array<{ id: string; priority: number; explanation?: string }>;
  businessIntent: Record<string, any>;
  openSignal?: string;
  timestamp: string;
  metadata: {
    stagesUsed: string[];
    regenerationCount: number;
    timeSpent?: number;
    errorsOrRetries: number;
    selectedStyles?: string[];
    planType?: string;
  };
}

/**
 * Generate feedback form based on project context
 */
export function generateFeedbackForm(context: ProjectContext): FeedbackFormSection[] {
  const sections: FeedbackFormSection[] = [];

  // Section 1: Overall Experience
  sections.push({
    id: 'overall',
    title: 'Overall Experience',
    description: 'How was your experience generating moodboards?',
    fields: [
      {
        id: 'overall_rating',
        type: 'emoji-scale',
        label: 'Overall satisfaction',
        description: 'How satisfied are you with the results?',
        required: true,
        options: [
          { value: '1', label: '😞' },
          { value: '2', label: '😐' },
          { value: '3', label: '🙂' },
          { value: '4', label: '😊' },
          { value: '5', label: '🤩' },
        ],
      },
      {
        id: 'experience_category',
        type: 'dropdown',
        label: 'What best describes your experience?',
        required: true,
        options: [
          { value: 'smooth', label: 'Smooth and intuitive' },
          { value: 'good_with_minor_issues', label: 'Good with minor issues' },
          { value: 'confusing', label: 'Confusing at times' },
          { value: 'frustrating', label: 'Frustrating' },
          { value: 'excellent', label: 'Excellent throughout' },
        ],
      },
      {
        id: 'speed_vs_quality',
        type: 'dropdown',
        label: 'Speed vs Quality tradeoff',
        description: 'How do you feel about the balance?',
        required: true,
        options: [
          { value: 'too_fast_low_quality', label: 'Too fast, quality suffered' },
          { value: 'good_balance', label: 'Good balance' },
          { value: 'too_slow_high_quality', label: 'Too slow, but quality is great' },
          { value: 'perfect', label: 'Perfect balance' },
        ],
      },
      {
        id: 'ai_understanding',
        type: 'dropdown',
        label: 'AI understanding accuracy',
        description: 'How well did AI understand your design intent?',
        required: true,
        options: [
          { value: 'poor', label: 'Poor - missed the mark' },
          { value: 'fair', label: 'Fair - partially understood' },
          { value: 'good', label: 'Good - mostly accurate' },
          { value: 'excellent', label: 'Excellent - exactly what I wanted' },
        ],
      },
    ],
  });

  // Section 2: Room-wise Feedback (Conditional)
  if (context.rooms.length > 0) {
    const roomFields: FeedbackField[] = [];
    
    if (context.isSingleTheme) {
      // Single theme flow - ask about coherence
      roomFields.push({
        id: 'theme_coherence',
        type: 'rating',
        label: 'Theme coherence across rooms',
        description: 'How consistent is the design theme across all rooms?',
        required: true,
        min: 1,
        max: 5,
      });
      roomFields.push({
        id: 'theme_consistency',
        type: 'dropdown',
        label: 'Theme consistency',
        required: true,
        options: [
          { value: 'very_consistent', label: 'Very consistent' },
          { value: 'mostly_consistent', label: 'Mostly consistent' },
          { value: 'somewhat_inconsistent', label: 'Somewhat inconsistent' },
          { value: 'very_inconsistent', label: 'Very inconsistent' },
        ],
      });
    } else {
      // Room-wise flow - loop through rooms
      context.rooms.forEach((room) => {
        if (room.hasMoodboard) {
          roomFields.push({
            id: `room_${room.id}_satisfaction`,
            type: 'rating',
            label: `${room.name} - Satisfaction`,
            required: true,
            min: 1,
            max: 5,
          });
          roomFields.push({
            id: `room_${room.id}_style_accuracy`,
            type: 'dropdown',
            label: `${room.name} - Style accuracy`,
            required: true,
            options: [
              { value: 'exact_match', label: 'Exact match to my intent' },
              { value: 'close_match', label: 'Close match' },
              { value: 'partial_match', label: 'Partial match' },
              { value: 'missed_mark', label: 'Missed the mark' },
            ],
          });
          roomFields.push({
            id: `room_${room.id}_usefulness`,
            type: 'dropdown',
            label: `${room.name} - Output usefulness`,
            required: true,
            options: [
              { value: 'very_useful', label: 'Very useful' },
              { value: 'somewhat_useful', label: 'Somewhat useful' },
              { value: 'not_very_useful', label: 'Not very useful' },
              { value: 'not_useful', label: 'Not useful' },
            ],
          });
        }
      });
    }

    if (roomFields.length > 0) {
      sections.push({
        id: 'room_feedback',
        title: context.isSingleTheme ? 'Theme Consistency' : 'Room-wise Feedback',
        description: context.isSingleTheme
          ? 'How well did the theme work across all rooms?'
          : 'How satisfied are you with each room\'s moodboard?',
        fields: roomFields,
      });
    }
  }

  // Section 3: AI Intelligence Evaluation
  const aiFields: FeedbackField[] = [
    {
      id: 'ai_strengths',
      type: 'multi-select',
      label: 'Where did AI feel strong?',
      description: 'Select all that apply',
      required: true,
      options: [
        { value: 'style_understanding', label: 'Style understanding' },
        { value: 'color_matching', label: 'Color matching' },
        { value: 'room_layout', label: 'Room layout suggestions' },
        { value: 'furniture_selection', label: 'Furniture selection' },
        { value: 'lighting_suggestions', label: 'Lighting suggestions' },
        { value: 'material_suggestions', label: 'Material suggestions' },
        { value: 'overall_coherence', label: 'Overall design coherence' },
      ],
    },
  ];

  // Add confusion fields if regenerations occurred
  if (context.regenerationCount > 0) {
    aiFields.push({
      id: 'ai_confusion',
      type: 'multi-select',
      label: 'Where did AI feel confusing?',
      description: 'Select all that apply',
      required: false,
      options: [
        { value: 'style_interpretation', label: 'Style interpretation' },
        { value: 'color_choices', label: 'Color choices' },
        { value: 'room_understanding', label: 'Room understanding' },
        { value: 'intent_capture', label: 'Intent capture' },
        { value: 'output_quality', label: 'Output quality' },
        { value: 'regeneration_process', label: 'Regeneration process' },
      ],
    });
  }

  // Add surprise field if regenerations or errors occurred
  if (context.regenerationCount > 0 || context.errorsOrRetries > 0) {
    aiFields.push({
      id: 'ai_surprises',
      type: 'multi-select',
      label: 'Where did AI surprise you?',
      description: 'Select all that apply',
      required: false,
      options: [
        { value: 'positive_surprise', label: 'Positive surprise - exceeded expectations' },
        { value: 'negative_surprise', label: 'Negative surprise - unexpected results' },
        { value: 'creative_suggestions', label: 'Creative suggestions I didn\'t think of' },
        { value: 'unexpected_combinations', label: 'Unexpected style combinations' },
      ],
    });
  }

  sections.push({
    id: 'ai_evaluation',
    title: 'AI Intelligence Evaluation',
    description: 'Help us understand how AI performed',
    fields: aiFields,
  });

  // Section 4: Improvement Signals
  sections.push({
    id: 'improvements',
    title: 'What should we improve?',
    description: 'Rank these by priority (drag to reorder)',
    fields: [
      {
        id: 'improvement_ranking',
        type: 'ranking',
        label: 'Improvement priorities',
        description: 'Drag to reorder, top = highest priority',
        required: true,
        options: [
          { value: 'ux', label: 'User Experience' },
          { value: 'accuracy', label: 'AI Accuracy' },
          { value: 'speed', label: 'Generation Speed' },
          { value: 'customization', label: 'Customization Options' },
          { value: 'control', label: 'User Control' },
          { value: 'realism', label: 'Output Realism' },
          { value: 'export_quality', label: 'Export Quality' },
        ],
      },
      {
        id: 'top_improvement_explanation',
        type: 'text',
        label: 'Brief explanation (optional)',
        description: 'Tell us more about your top priority',
        required: false,
        placeholder: 'e.g., "I wish I could adjust colors after generation"',
      },
    ],
  });

  // Section 5: Business & Intent Signals
  sections.push({
    id: 'business',
    title: 'Usage & Intent',
    description: 'Help us understand your use case',
    fields: [
      {
        id: 'usage_purpose',
        type: 'dropdown',
        label: 'What\'s the purpose of this project?',
        required: true,
        options: [
          { value: 'personal', label: 'Personal use' },
          { value: 'client', label: 'For a client' },
          { value: 'exploration', label: 'Exploring ideas' },
          { value: 'professional', label: 'Professional project' },
          { value: 'education', label: 'Education/learning' },
        ],
      },
      {
        id: 'reuse_likelihood',
        type: 'slider',
        label: 'Likelihood of reusing this tool',
        description: 'How likely are you to use this again?',
        required: true,
        min: 0,
        max: 10,
        step: 1,
      },
      {
        id: 'recommendation_likelihood',
        type: 'slider',
        label: 'Likelihood of recommending',
        description: 'How likely are you to recommend to others?',
        required: true,
        min: 0,
        max: 10,
        step: 1,
      },
      {
        id: 'price_fairness',
        type: 'dropdown',
        label: 'Price fairness perception',
        required: true,
        options: [
          { value: 'very_fair', label: 'Very fair' },
          { value: 'fair', label: 'Fair' },
          { value: 'somewhat_expensive', label: 'Somewhat expensive' },
          { value: 'too_expensive', label: 'Too expensive' },
          { value: 'not_sure', label: 'Not sure' },
        ],
      },
    ],
  });

  // Section 6: Optional Open Signal
  sections.push({
    id: 'open_signal',
    title: 'Anything else?',
    description: 'Optional - share any additional thoughts',
    fields: [
      {
        id: 'open_feedback',
        type: 'text',
        label: 'Additional feedback (optional)',
        required: false,
        placeholder: 'e.g., "Love the speed, but wish I could preview before generating"',
      },
    ],
  });

  return sections;
}

/**
 * Transform form data into structured feedback payload
 */
export function transformFeedbackData(
  formData: Record<string, any>,
  context: ProjectContext
): FeedbackData {
  const ratings: Record<string, number | string> = {};
  const aiEvaluation: Record<string, any> = {};
  const improvementSignals: Array<{ id: string; priority: number; explanation?: string }> = [];
  const businessIntent: Record<string, any> = {};

  // Extract ratings
  Object.keys(formData).forEach((key) => {
    if (key.startsWith('overall_') || key.startsWith('room_') || key.includes('rating')) {
      ratings[key] = formData[key];
    }
  });

  // Extract AI evaluation
  if (formData.ai_strengths) {
    aiEvaluation.strengths = Array.isArray(formData.ai_strengths) ? formData.ai_strengths : [formData.ai_strengths];
  }
  if (formData.ai_confusion) {
    aiEvaluation.confusion = Array.isArray(formData.ai_confusion) ? formData.ai_confusion : [formData.ai_confusion];
  }
  if (formData.ai_surprises) {
    aiEvaluation.surprises = Array.isArray(formData.ai_surprises) ? formData.ai_surprises : [formData.ai_surprises];
  }

  // Extract improvement signals
  if (formData.improvement_ranking) {
    const ranking = Array.isArray(formData.improvement_ranking) 
      ? formData.improvement_ranking 
      : [formData.improvement_ranking];
    
    ranking.forEach((item: string, index: number) => {
      improvementSignals.push({
        id: item,
        priority: index + 1,
        explanation: index === 0 ? formData.top_improvement_explanation : undefined,
      });
    });
  }

  // Extract business intent
  if (formData.usage_purpose) businessIntent.usagePurpose = formData.usage_purpose;
  if (formData.reuse_likelihood !== undefined) businessIntent.reuseLikelihood = formData.reuse_likelihood;
  if (formData.recommendation_likelihood !== undefined) businessIntent.recommendationLikelihood = formData.recommendation_likelihood;
  if (formData.price_fairness) businessIntent.priceFairness = formData.price_fairness;

  return {
    projectId: context.projectId,
    userId: context.userId,
    rooms: context.rooms.map(r => r.id),
    ratings,
    aiEvaluation,
    improvementSignals,
    businessIntent,
    openSignal: formData.open_feedback || undefined,
    timestamp: new Date().toISOString(),
    metadata: {
      stagesUsed: context.stagesUsed,
      regenerationCount: context.regenerationCount,
      timeSpent: context.timeSpent,
      errorsOrRetries: context.errorsOrRetries,
      selectedStyles: context.selectedStyles,
      planType: context.planType,
    },
  };
}

