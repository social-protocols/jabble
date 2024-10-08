import { OpenAI } from 'openai';
// import { zodResponseFormat } from 'openai/helpers/zod.mjs';
import { zodResponseFormat } from 'openai/helpers/zod.mjs';
import { z } from 'zod';
import { invariant } from '#app/utils/misc.tsx';
// import { i } from 'vitest/dist/reporters-5f784f42.js';

// Define the Message type to match OpenAI's ChatCompletionMessage
type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const ClaimExtractionSchema = z.object({
	claims: z
		.array(
			z
				.object({
					claim: z
						.string()
						.describe(
							'A claim made in the text.',
						),
					factOrOpinion: z
						.enum(['verifiable fact', 'debateable fact', 'opinion'])
						.describe(
							'Whether the claim is a statement of verifiable fact, debateable fact, or judgment/opinion.',
						),
					reasoning: z
						.string()
						.describe(
							'Why this claim is either a statement of verifiable fact, debateable fact, or judgment/opinion.',
						),
				})
		)
		.describe(
			'All the claims made in the quote.',
		),
})
export async function extractClaims(content: string, _context: string): Promise<string[]> {
  const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY, // Ensure your API key is set
  });

  const script: string[] = [

`Extract all claims made in the quote.
Claims should be direct: For example, if a speaker makes claim X, extract "X", not "Speaker claims X".
Don't use the passive form.
If a speaker uses the personal pronoun "I", try to infer the person's name and restate the claim in the third person.
`,


`LIST1 includes "meta-claims", which are claims about what the speaker said, thinks, supports, etc., as well as "direct claims" made directly by the speaker.

Discuss each claim in LIST1, and explain why either 1) the claim was directly made by the speaker, or 2) the claim is a meta-claim about the speaker.

Finally, output a list of direct claims only`,


`In LIST2, some claims make a normative statement (something should be a certain way) and some make a descriptive statement (something is a certain way). Output new list of claims labeling each as "normative" or "descriptive".`,


`In LIST3, some of the normative claims strongly "imply" other descriptive claims. Discuss each normative claim, and any descriptive claims it implies. Finally, output a new list of implied or implicit descriptive claims.`,


`Output a list combining all descriptive claims from LIST2 and LIST3.`,


`Some of the claims in LIST5 are verifiable fact. Others are matter of facts that are debateable. Others are matters of judgment or opinion.

Briefly discuss each claim in LIST5 and why it is either a verifiable fact or a matter of judgment or opinion.

Finally, output a list of all implicit and explicit claims from LIST4, and label each one "verifiable fact", "debateable fact" or "opinion".
`
];

  const initialMessage = script[0] + "\nOutput claims as a JSON list labeled LIST1";

  invariant(initialMessage !== undefined, 'no initial message');

  const followupMessages = script.slice(1)

  const initialMessages: Message[] = [
	{ role: 'system', content: initialMessage },
	{ role: 'user', content: '***Quote:***\n\n' + content },
  ];

  const { assistantReplies } = await runChatScript(openai, initialMessages, followupMessages);

  // Process assistantReplies as needed
  // assistantReplies.forEach((reply, index) => {
// 	console.log(`\n\nAssistant reply ${index + 1}:`, reply.content);
  // });

  return [];
}



async function chatScriptStep(
  openai: OpenAI,
  step: number,
  messages: Message[],
  isFinal: boolean
): Promise<Message> {

  console.log(`\n\n==== Executing script step ${step} ====\nPrompt: ${messages[messages.length-1].content}`)
  let completion = await openai.chat.completions.create({
	model: 'gpt-4o-mini', // Use 'gpt-3.5-turbo' if 'gpt-4' is not available
	messages: messages,
	seed: 1337,
	temperature: 0,
	top_p: 1,
	// response_format: isFinal ? zodResponseFormat(ClaimExtractionSchema, 'event') : undefined,
  });


  let choice = completion.choices[0];
  invariant(choice !== undefined, 'no choice');

  // Ensure 'choice.message' exists and 'content' is not null
  if (!choice.message || !choice.message.content) {
	throw new Error('Assistant reply is undefined or has no content');
  }

  let assistantReply: Message = {
	role: choice.message.role as 'assistant',
	content: choice.message.content,
  };

  console.log(`\n\n===== Output of step ${step} =====\n`, assistantReply.content);

  return assistantReply
}

async function runChatScript(
  openai: OpenAI,
  initialMessages: Message[],
  systemMessages: string[]
): Promise<{ messages: Message[]; assistantReplies: Message[] }> {
  let messages: Message[] = [...initialMessages];
  let assistantReplies: Message[] = [];

  // First API call
  const assistantReply = await chatScriptStep(openai, 1, messages, false);

  messages.push(assistantReply);
  assistantReplies.push(assistantReply);

  for (let i = 0; i < systemMessages.length; i++) {
	const systemMessage = systemMessages[i] + "\nOutput claims as a JSON list labeled LIST" + (i + 2);

	invariant(systemMessage !== undefined, 'no system message');
	messages.push({ role: 'system', content: systemMessage });

	const assistantReply = await chatScriptStep(openai, i+2, messages, i == systemMessages.length-1);


	messages.push(assistantReply);
	assistantReplies.push(assistantReply);

  }

  return { messages, assistantReplies };
}

async function testExtractClaims() {
  const content = `Our teachers, nurses, and firefighters should not be paying more in taxes than billionaires.

That’s why I support a billionaire minimum tax and will ensure corporations pay their fair share."

-- Kamala Harris`;



//   const content = `You‘re setting up a strawman argument there. Nobody claims hurricanes are caused by global warming. But the impacts are getting larger because warmer ocean surface temperatures increase the amount of precipitation they carry, and they make them intensify more rapidly, as we see particularly in the Gulf of Mexico. Plus the rising sea level makes the storm surges worse. (And of course I wouldn’t cite Republican political scientist Pielke Junior, who is a long-standing disinformer on climate science.)

// -- Prof. Stefan Rahmstorf @rahmstorf Oct 6`

  const result = await extractClaims(content, '');

  console.log('Result:', result);
}

testExtractClaims().catch(console.error);
