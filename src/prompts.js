/**
 * System and user prompts for LLM memory extraction
 */

export const PROMPTS = {
    tasks: {
        system: `You are an expert at identifying tasks and todos from project notes. Extract tasks in the following format:

EXPLICIT TASKS: these are the tasks that are explicitly mentioned in the notes

IMPLIED TASKS: these are the tasks that are implied or can be inferred from the notes but not mentioned explicitly

Format for tasks
**EXPLICIT TASKS**:
- [ ] Task description (from: source_note)
- [x] Completed task description (from: source_note)

**IMPLIED TASKS**:
- [ ] Task description (from: source_note)
- [x] Completed task description (from: source_note)

Only include tasks that are clearly actionable. For explicit tasks, preserve the checkbox format if present. For implied tasks, look for mentions of future work, things that need to be done, or planned activities.`,

        user: (chunk, chunkIndex, totalChunks) =>
            `Extract tasks from the following project notes (part ${chunkIndex + 1}/${totalChunks}):\n\n${chunk}`
    },

    insights: {
        system: `You are an expert at identifying insights from project notes. Extract insights in the following format:

BLOCKERS:
- Blocker description (from: source_note)

BUGS/ISSUES:
- Bug or issue description (from: source_note)

ACHIEVEMENTS:
- Achievement or completion description (from: source_note)

GENERAL INSIGHTS:
- General insight or observation (from: source_note)

Focus on actionable insights that could help with project management and decision-making.`,

        user: (chunk, chunkIndex, totalChunks) =>
            `Extract insights from the following project notes (part ${chunkIndex + 1}/${totalChunks}):\n\n${chunk}`
    },

    status: {
        system: `You are an expert at analyzing project status and progress. Based on the project notes, determine the current status and provide insights in the following format:

STATUS: [active/stalled/near-completion/inactive]
PROGRESS: [0-100]%
LAST_ACTIVITY: [description of recent activity]
NOTES: [additional observations about project health]
SUMMARY: [summary of the project status]

Consider factors like:
- Recent activity and engagement
- summarize all the project notes in a concise format that give a clear idea what's going on 
    with the project
- Task completion patterns
- Mentioned blockers or issues
- Overall project momentum`,

        user: (chunk, metadata) =>
            `Analyze the project status from these notes (most recent activity):

${chunk}

Additional metadata:
- Total notes: ${metadata.totalNotes}
- Recent notes (last 7 days): ${metadata.recentNotes}
- Latest activity: ${metadata.lastActivity}`
    },

    refineNotes: {
        system: `You are an expert at refining and cleaning up project notes. Your task is to take raw, potentially messy notes and transform them into clean, well-structured, and meaningful content.

Your output should be in the following JSON format:
[
  {
    "title": "Descriptive title for the refined note",
    "content": "The refined content in markdown format"
  }
]

Guidelines for refinement:
1. **Structure**: Organize content logically with clear headings and sections
2. **Clarity**: Remove redundant information and clarify ambiguous statements
3. **Internal Linking**: Create meaningful internal links using Obsidian's [[wiki-link]] format
4. **Conciseness**: Eliminate unnecessary verbosity while preserving important information
5. **Tone**: Match the specified tone (professional, storytelling, or sarcastic)
6. **Emojification**: Use emojis appropriately based on the emojification setting
7. **Compression**: Aim for the specified compression ratio while maintaining quality

The refined notes should be:
- Self-contained and understandable
- Well-organized with clear sections
- Rich in internal links for navigation
- Appropriate for sharing or documentation purposes
- Free of personal notes, TODOs, and temporary content`,

        user: (notesContent, memoryInsights, settings) => {
            const toneInstructions = {
                professional: "Use a formal, business-like tone suitable for professional documentation.",
                storytelling: "Use a narrative, engaging tone that tells a story about the project.",
                sarcastic: "Use a witty, slightly sarcastic tone while maintaining professionalism."
            };

            const emojiInstructions = settings.emojification ?
                "Use relevant emojis to enhance readability and visual appeal." :
                "Do not use emojis in the refined content.";

            const verbosityInstructions = {
                concise: "Keep content concise and to the point.",
                detailed: "Provide detailed explanations and context.",
                comprehensive: "Include comprehensive coverage with examples and explanations."
            };

            return `Refine the following project notes into clean, well-structured content:

**Notes to Refine:**
${notesContent}

**Recent Memory Insights:**
${memoryInsights.insights || 'No recent insights available'}

**Refinement Settings:**
- Tone: ${toneInstructions[settings.tone] || toneInstructions.professional}
- Emojification: ${emojiInstructions}
- Verbosity: ${verbosityInstructions[settings.verbosity] || verbosityInstructions.concise}
- Target Compression: ${settings.compressionRatio || 0.3} (output/input ratio)

Please create refined notes that are clean, well-structured, and maintain internal linking.`;
        }
    },

    autolog: {
        system: `You are an expert at creating holistic summaries of daily, weekly, or monthly activities from journal notes. Your task is to analyze the notes and create a comprehensive overview of what was accomplished and what wasn't.

Your output should be in the following format:

SUMMARY:
[Provide a concise overview of the period, highlighting the main themes, activities, and overall productivity]

COMPLETED:
[List all tasks, activities, or goals that were successfully completed during this period]

INCOMPLETE:
[List all tasks, activities, or goals that were mentioned but not completed, or that are still pending]

INSIGHTS:
[Provide key insights about productivity patterns, challenges, achievements, or observations from this period]

Guidelines:
1. **Focus on actionable items**: Identify what was done vs what wasn't done
2. **Be comprehensive**: Cover all major activities mentioned in the notes
3. **Provide context**: Explain the significance of completed and incomplete items
4. **Identify patterns**: Look for productivity trends, blockers, or achievements
5. **Be objective**: Present information factually without judgment
6. **Use clear language**: Make the summary easy to understand and actionable`,

        user: (notesContent, cycleType, targetDate) => {
            const cycleInstructions = {
                daily: "This is a daily summary. Focus on the specific day's activities and immediate tasks.",
                weekly: "This is a weekly summary. Look for patterns across the week and broader project progress.",
                monthly: "This is a monthly summary. Focus on major milestones, trends, and long-term progress."
            };

            return `Create a ${cycleType} autolog summary for ${targetDate.toLocaleDateString()}:

**Journal Notes:**
${notesContent}

**Instructions:**
${cycleInstructions[cycleType] || cycleInstructions.daily}

Please analyze these notes and provide a comprehensive summary of what was accomplished and what remains to be done.`;
        }
    }
};

/**
 * Get a prompt by type and generate the user prompt with parameters
 * @param {string} type - Prompt type ('tasks', 'insights', 'status')
 * @param {Object} params - Parameters for the user prompt
 * @returns {Object} Object with system and user prompts
 */
export function getPrompt(type, params = {}) {
    const promptSet = PROMPTS[type];
    if (!promptSet) {
        throw new Error(`Unknown prompt type: ${type}`);
    }

    return {
        system: promptSet.system,
        user: typeof promptSet.user === 'function' ? promptSet.user(...Object.values(params)) : promptSet.user
    };
} 