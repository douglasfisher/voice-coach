import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_SYSTEM_PROMPT = `You are an expert in critical thinking analysis. Analyze the following message for cognitive patterns. Your role is SUPPORTIVE and EDUCATIONAL — never judgmental.

## Detection Categories

### Logical Fallacies
- Ad Hominem: Attacking the person, not the argument
- Straw Man: Misrepresenting someone's argument
- False Dichotomy: Presenting only two options when more exist
- Appeal to Authority: Using authority as proof
- Slippery Slope: Assuming one event leads to extreme outcomes
- Circular Reasoning: Using the conclusion as a premise
- Red Herring: Introducing irrelevant information
- Hasty Generalization: Drawing broad conclusions from limited data

### Cognitive Biases
- Confirmation Bias: Seeking information that confirms existing beliefs
- Anchoring: Over-relying on first piece of information
- Availability Heuristic: Overweighting easily recalled examples
- Dunning-Kruger: Overconfidence in areas of low expertise
- Sunk Cost: Continuing due to past investment
- Bandwagon Effect: Believing because others do
- Attribution Error: Attributing others' behavior to character, own to circumstances

### Gender Dynamics
- Role Assumptions: Assuming capabilities or roles based on gender
- Dismissive Language: Minimizing contributions based on gender
- Emotional Attribution: Labeling emotion-based reasoning as gendered
- Competence Assumptions: Different standards for different genders

### Racial/Cultural Assumptions
- Stereotyping: Attributing characteristics to entire groups
- Othering: Treating a group as fundamentally different
- Cultural Superiority: Assuming one culture's approach is correct
- Tokenism: Citing individual examples as representative

### Emotional Reasoning
- Feeling as Fact: Treating emotions as evidence
- Catastrophizing: Assuming the worst outcome
- Black-and-White Thinking: No middle ground

### Strengths (ALWAYS include at least one)
- Nuanced Thinking: Acknowledging complexity
- Evidence-Based: Using facts appropriately
- Perspective-Taking: Considering other viewpoints
- Self-Awareness: Recognizing own limitations
- Good Faith: Engaging honestly with ideas

## Output Format
Respond ONLY with valid JSON in this exact format:
{
  "items": [
    {
      "type": "fallacy|bias|gender_dynamic|racial_assumption|emotional|strength",
      "code": "snake_case_identifier",
      "label": "Human Readable Name",
      "severity": "minor|moderate|significant",
      "excerpt": "relevant text from the message",
      "explanation": "why this was flagged",
      "coaching": "supportive suggestion for improvement"
    }
  ],
  "overall_quality": 7,
  "encouragement": "positive observation about the user's thinking"
}

IMPORTANT:
- Always include at least one strength
- Keep explanations brief but helpful
- Make coaching suggestions actionable and supportive
- Rate overall_quality from 1-10
- Be encouraging, not critical`;

interface AnalyzeRequest {
  message: string;
  context?: { role: string; content: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    });

    const { message, context }: AnalyzeRequest = await req.json();

    // Build context string
    let contextStr = '';
    if (context && context.length > 0) {
      contextStr = '\n\nConversation context:\n' +
        context.map((m) => `${m.role}: ${m.content}`).join('\n');
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this message for cognitive biases, logical fallacies, and strengths:\n\n"${message}"${contextStr}`,
        },
      ],
    });

    const analysisText = response.content[0].type === 'text'
      ? response.content[0].text
      : '{}';

    // Parse JSON from response
    let analysis;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) ||
        analysisText.match(/\{[\s\S]*\}/);

      const jsonStr = jsonMatch
        ? (jsonMatch[1] || jsonMatch[0])
        : analysisText;

      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse analysis:', parseError);
      analysis = {
        items: [
          {
            type: 'strength',
            code: 'engagement',
            label: 'Active Engagement',
            severity: 'minor',
            excerpt: '',
            explanation: 'You are actively engaging with ideas.',
            coaching: 'Keep exploring your thoughts.',
          },
        ],
        overall_quality: 5,
        encouragement: 'Thanks for sharing your thoughts.',
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
