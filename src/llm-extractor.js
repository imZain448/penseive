import { Notice } from 'obsidian';
import { getPrompt } from './prompts.js';

/**
 * LLM-powered memory extractor with token management
 */
export class LLMExtractor {
    constructor(settings) {
        this.settings = settings;
        this.tokenEstimates = {
            openai: { 'gpt-3.5': 4096, 'gpt-4': 8192, 'gpt-4-turbo': 128000 },
            gemini: { 'gemini-pro': 32768, 'gemini-1.5': 1048576, 'gemini-2.0': 32768 },
            ollama: { llama2: 4096, mistral: 8192, phi3: 8192 } // Default estimates
        };
    }

    /**
 * Get context window size for current model
 * @returns {number} Context window size in tokens
 */
    getContextWindow() {
        const { llmProvider, model } = this.settings;
        const providerTokens = this.tokenEstimates[llmProvider] || {};

        // Find matching prefix
        for (const [prefix, tokens] of Object.entries(providerTokens)) {
            if (model.startsWith(prefix)) {
                return tokens;
            }
        }

        return 4096; // Default fallback
    }

    /**
     * Estimate tokens in text (rough approximation)
     * @param {string} text - Text to estimate
     * @returns {number} Estimated token count
     */
    estimateTokens(text) {
        // Rough approximation: 1 token ≈ 4 characters for English text
        return Math.ceil(text.length / 4);
    }

    /**
     * Split content into chunks that fit within token limit
     * @param {string} content - Content to split
     * @param {number} maxTokens - Maximum tokens per chunk
     * @returns {string[]} Array of content chunks
     */
    splitContent(content, maxTokens) {
        const chunks = [];
        const lines = content.split('\n');
        let currentChunk = '';
        let currentTokens = 0;

        for (const line of lines) {
            const lineTokens = this.estimateTokens(line + '\n');

            if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = line + '\n';
                currentTokens = lineTokens;
            } else {
                currentChunk += line + '\n';
                currentTokens += lineTokens;
            }
        }

        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Make LLM API call
     * @param {string} prompt - Prompt to send
     * @param {string} systemPrompt - System prompt
     * @returns {Promise<string>} LLM response
     */
    async makeLLMCall(prompt, systemPrompt = '') {
        const { llmProvider, apiKey, model } = this.settings;

        try {
            if (llmProvider === 'openai') {
                return await this.callOpenAI(prompt, systemPrompt);
            } else if (llmProvider === 'gemini') {
                return await this.callGemini(prompt, systemPrompt);
            } else if (llmProvider === 'ollama') {
                return await this.callOllama(prompt, systemPrompt);
            } else {
                throw new Error(`Unsupported provider: ${llmProvider}`);
            }
        } catch (error) {
            console.error('LLM call failed:', error);
            throw error;
        }
    }

    /**
     * Call OpenAI API
     * @param {string} prompt - User prompt
     * @param {string} systemPrompt - System prompt
     * @returns {Promise<string>} Response
     */
    async callOpenAI(prompt, systemPrompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.settings.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Call Gemini API
     * @param {string} prompt - User prompt
     * @param {string} systemPrompt - System prompt
     * @returns {Promise<string>} Response
     */
    async callGemini(prompt, systemPrompt) {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${this.settings.model}:generateContent?key=${this.settings.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    /**
     * Call Ollama API
     * @param {string} prompt - User prompt
     * @param {string} systemPrompt - System prompt
     * @returns {Promise<string>} Response
     */
    async callOllama(prompt, systemPrompt) {
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.settings.model,
                prompt: fullPrompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    num_predict: 1000
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    }

    /**
 * Extract tasks from notes using LLM
 * @param {string} notesContent - Combined notes content
 * @returns {Promise<Object>} Extracted tasks
 */
    async extractTasks(notesContent) {
        const maxTokens = Math.floor(this.getContextWindow() * 0.5); // 50% of context window
        const chunks = this.splitContent(notesContent, maxTokens);

        const allTasks = {
            explicit: [],
            implied: []
        };

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const { system, user } = getPrompt('tasks', [chunk, i, chunks.length]);

            try {
                const response = await this.makeLLMCall(user, system);
                const parsedTasks = this.parseTaskResponse(response);

                // Merge results
                allTasks.explicit.push(...parsedTasks.explicit);
                allTasks.implied.push(...parsedTasks.implied);
            } catch (error) {
                console.error(`Error extracting tasks from chunk ${i + 1}:`, error);
            }
        }

        return allTasks;
    }

    /**
 * Extract insights from notes using LLM
 * @param {string} notesContent - Combined notes content
 * @returns {Promise<Object>} Extracted insights
 */
    async extractInsights(notesContent) {
        const maxTokens = Math.floor(this.getContextWindow() * 0.5);
        const chunks = this.splitContent(notesContent, maxTokens);

        const allInsights = {
            blockers: [],
            bugs: [],
            achievements: [],
            general: []
        };

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const { system, user } = getPrompt('insights', [chunk, i, chunks.length]);

            try {
                const response = await this.makeLLMCall(user, system);
                const parsedInsights = this.parseInsightResponse(response);

                // Merge results
                allInsights.blockers.push(...parsedInsights.blockers);
                allInsights.bugs.push(...parsedInsights.bugs);
                allInsights.achievements.push(...parsedInsights.achievements);
                allInsights.general.push(...parsedInsights.general);
            } catch (error) {
                console.error(`Error extracting insights from chunk ${i + 1}:`, error);
            }
        }

        return allInsights;
    }

    /**
 * Determine project status using LLM
 * @param {string} notesContent - Combined notes content
 * @param {Object} metadata - Additional metadata (note count, dates, etc.)
 * @returns {Promise<Object>} Project status
 */
    async determineProjectStatus(notesContent, metadata) {
        const maxTokens = Math.floor(this.getContextWindow() * 0.5);
        const chunks = this.splitContent(notesContent, maxTokens);

        // Use first chunk for status determination (most recent activity)
        const chunk = chunks[0];

        const { system, user } = getPrompt('status', [chunk, metadata]);

        try {
            const response = await this.makeLLMCall(user, system);
            return this.parseStatusResponse(response, metadata);
        } catch (error) {
            console.error('Error determining project status:', error);
            // Fallback to basic status
            return {
                status: 'active',
                progress: Math.min(100, (metadata.recentNotes / Math.max(1, metadata.totalNotes)) * 100),
                lastActivity: metadata.lastActivity,
                totalNotes: metadata.totalNotes,
                recentNotes: metadata.recentNotes
            };
        }
    }

    /**
     * Parse task extraction response
     * @param {string} response - LLM response
     * @returns {Object} Parsed tasks
     */
    parseTaskResponse(response) {
        const tasks = { explicit: [], implied: [] };
        const lines = response.split('\n');

        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('EXPLICIT TASKS:')) {
                currentSection = 'explicit';
            } else if (trimmed.startsWith('IMPLIED TASKS:')) {
                currentSection = 'implied';
            } else if (trimmed.startsWith('-') && currentSection) {
                const taskText = trimmed.substring(1).trim();
                const task = {
                    text: taskText,
                    completed: taskText.includes('[x]') || taskText.includes('[X]'),
                    source: 'LLM extracted'
                };

                if (currentSection === 'explicit') {
                    tasks.explicit.push(task);
                } else {
                    tasks.implied.push(task);
                }
            }
        }

        return tasks;
    }

    /**
     * Parse insight extraction response
     * @param {string} response - LLM response
     * @returns {Object} Parsed insights
     */
    parseInsightResponse(response) {
        const insights = { blockers: [], bugs: [], achievements: [], general: [] };
        const lines = response.split('\n');

        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('BLOCKERS:')) {
                currentSection = 'blockers';
            } else if (trimmed.startsWith('BUGS/ISSUES:')) {
                currentSection = 'bugs';
            } else if (trimmed.startsWith('ACHIEVEMENTS:')) {
                currentSection = 'achievements';
            } else if (trimmed.startsWith('GENERAL INSIGHTS:')) {
                currentSection = 'general';
            } else if (trimmed.startsWith('-') && currentSection) {
                const insight = {
                    text: trimmed.substring(1).trim(),
                    source: 'LLM extracted'
                };

                insights[currentSection].push(insight);
            }
        }

        return insights;
    }

    /**
     * Parse status determination response
     * @param {string} response - LLM response
     * @param {Object} metadata - Original metadata
     * @returns {Object} Parsed status
     */
    parseStatusResponse(response, metadata) {
        const status = {
            status: 'active',
            progress: 50,
            lastActivity: metadata.lastActivity,
            totalNotes: metadata.totalNotes,
            recentNotes: metadata.recentNotes
        };

        const lines = response.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('STATUS:')) {
                const statusMatch = trimmed.match(/STATUS:\s*(\w+)/i);
                if (statusMatch) {
                    status.status = statusMatch[1].toLowerCase();
                }
            } else if (trimmed.startsWith('PROGRESS:')) {
                const progressMatch = trimmed.match(/PROGRESS:\s*(\d+)%/);
                if (progressMatch) {
                    status.progress = parseInt(progressMatch[1]);
                }
            } else if (trimmed.startsWith('LAST_ACTIVITY:')) {
                const activityMatch = trimmed.match(/LAST_ACTIVITY:\s*(.+)/);
                if (activityMatch) {
                    status.lastActivity = activityMatch[1].trim();
                }
            }
        }

        return status;
    }

    /**
     * Refine notes using LLM
     * @param {string} notesContent - Combined notes content
     * @param {Object} memoryInsights - Recent memory insights
     * @param {Object} settings - Refinement settings
     * @returns {Promise<Object[]>} Array of refined notes
     */
    async refineNotes(notesContent, memoryInsights, settings) {
        const maxTokens = Math.floor(this.getContextWindow() * 0.7);
        const chunks = this.splitContent(notesContent, maxTokens);

        // Process each chunk and collect refined notes
        const allRefinedNotes = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const { system, user } = getPrompt('refineNotes', [chunk, memoryInsights, settings]);

            try {
                const response = await this.makeLLMCall(user, system);
                const parsedNotes = this.parseRefineResponse(response);
                allRefinedNotes.push(...parsedNotes);
            } catch (error) {
                console.error(`Error refining notes from chunk ${i + 1}:`, error);
                // Fallback: create a simple refined note
                allRefinedNotes.push({
                    title: `Refined Notes - Chunk ${i + 1}`,
                    content: `# Refined Notes\n\n${chunk}`
                });
            }
        }

        return allRefinedNotes;
    }

    /**
     * Parse note refinement response
     * @param {string} response - LLM response
     * @returns {Object[]} Array of refined notes
     */
    parseRefineResponse(response) {
        try {
            // Try to parse as JSON first
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.map(note => ({
                        title: note.title || 'Untitled Note',
                        content: note.content || ''
                    }));
                }
            }

            // Fallback: parse as markdown sections
            const notes = [];
            const sections = response.split(/(?=^# )/m);

            for (const section of sections) {
                if (section.trim()) {
                    const titleMatch = section.match(/^# (.+)$/m);
                    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Note';
                    const content = section.replace(/^# .+$/m, '').trim();

                    if (content) {
                        notes.push({ title, content });
                    }
                }
            }

            return notes.length > 0 ? notes : [{ title: 'Refined Notes', content: response }];
        } catch (error) {
            console.error('Error parsing refine response:', error);
            return [{ title: 'Refined Notes', content: response }];
        }
    }

    /**
     * Generate autolog summary using LLM
     * @param {string} notesContent - Combined notes content
     * @param {string} cycleType - Type of cycle ('daily', 'weekly', 'monthly')
     * @param {Date} targetDate - Target date for the cycle
     * @returns {Promise<Object>} Autolog data
     */
    async generateAutolog(notesContent, cycleType, targetDate) {
        const maxTokens = Math.floor(this.getContextWindow() * 0.7);
        const chunks = this.splitContent(notesContent, maxTokens);

        // Process each chunk and collect autolog data
        const allAutologData = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const { system, user } = getPrompt('autolog', [chunk, cycleType, targetDate]);

            try {
                const response = await this.makeLLMCall(user, system);
                const parsedData = this.parseAutologResponse(response);
                allAutologData.push(parsedData);
            } catch (error) {
                console.error(`Error generating autolog from chunk ${i + 1}:`, error);
                // Fallback: create basic autolog data
                allAutologData.push({
                    summary: `Processed notes from chunk ${i + 1}`,
                    completed: 'No completed tasks identified',
                    incomplete: 'No incomplete tasks identified',
                    insights: 'No insights available'
                });
            }
        }

        // Combine all autolog data
        return this.combineAutologData(allAutologData);
    }

    /**
     * Parse autolog response
     * @param {string} response - LLM response
     * @returns {Object} Parsed autolog data
     */
    parseAutologResponse(response) {
        const autologData = {
            summary: '',
            completed: '',
            incomplete: '',
            insights: ''
        };

        const lines = response.split('\n');
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('SUMMARY:')) {
                currentSection = 'summary';
            } else if (trimmed.startsWith('COMPLETED:')) {
                currentSection = 'completed';
            } else if (trimmed.startsWith('INCOMPLETE:')) {
                currentSection = 'incomplete';
            } else if (trimmed.startsWith('INSIGHTS:')) {
                currentSection = 'insights';
            } else if (trimmed.length > 0 && currentSection) {
                if (currentSection === 'summary') {
                    autologData.summary += (autologData.summary ? '\n' : '') + trimmed;
                } else if (currentSection === 'completed') {
                    autologData.completed += (autologData.completed ? '\n' : '') + trimmed;
                } else if (currentSection === 'incomplete') {
                    autologData.incomplete += (autologData.incomplete ? '\n' : '') + trimmed;
                } else if (currentSection === 'insights') {
                    autologData.insights += (autologData.insights ? '\n' : '') + trimmed;
                }
            }
        }

        return autologData;
    }

    /**
     * Combine multiple autolog data objects into one
     * @param {Object[]} autologDataArray - Array of autolog data objects
     * @returns {Object} Combined autolog data
     */
    combineAutologData(autologDataArray) {
        const combined = {
            summary: '',
            completed: '',
            incomplete: '',
            insights: ''
        };

        for (const data of autologDataArray) {
            if (data.summary) {
                combined.summary += (combined.summary ? '\n\n' : '') + data.summary;
            }
            if (data.completed) {
                combined.completed += (combined.completed ? '\n\n' : '') + data.completed;
            }
            if (data.incomplete) {
                combined.incomplete += (combined.incomplete ? '\n\n' : '') + data.incomplete;
            }
            if (data.insights) {
                combined.insights += (combined.insights ? '\n\n' : '') + data.insights;
            }
        }

        return combined;
    }

    /**
     * Analyze multiple autologs with custom prompt
     * @param {string} autologsContent - Combined content of multiple autologs
     * @param {string} customPrompt - Custom prompt for analysis
     * @returns {Promise<string>} Analysis result
     */
    async analyzeAutologs(autologsContent, customPrompt) {
        const maxTokens = Math.floor(this.getContextWindow() * 0.7);
        const chunks = this.splitContent(autologsContent, maxTokens);

        // Process each chunk and collect analysis results
        const allAnalysisResults = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const systemPrompt = `You are an expert at analyzing patterns and trends from multiple autolog entries. Your task is to provide insights based on the custom prompt provided by the user.

Guidelines:
1. **Focus on patterns**: Look for recurring themes, trends, and patterns across the autologs
2. **Provide actionable insights**: Give specific, actionable recommendations
3. **Be comprehensive**: Cover all aspects mentioned in the custom prompt
4. **Use clear language**: Make the analysis easy to understand
5. **Be objective**: Present information factually without judgment`;

            const userPrompt = `Custom Analysis Request: ${customPrompt}

Autolog Content (Part ${i + 1}/${chunks.length}):
${chunk}

Please analyze this content according to the custom prompt and provide detailed insights.`;

            try {
                const response = await this.makeLLMCall(userPrompt, systemPrompt);
                allAnalysisResults.push(response);
            } catch (error) {
                console.error(`Error analyzing autolog chunk ${i + 1}:`, error);
                allAnalysisResults.push(`Error analyzing chunk ${i + 1}: ${error.message}`);
            }
        }

        // Combine all analysis results
        return allAnalysisResults.join('\n\n---\n\n');
    }
} 