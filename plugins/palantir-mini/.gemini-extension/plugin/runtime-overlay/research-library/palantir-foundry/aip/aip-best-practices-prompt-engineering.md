---
source: https://www.palantir.com/docs/foundry/aip/best-practices-prompt-engineering/
fetched: 2026-04-20
section: aip-stack
doc_title: Best practices for LLM prompt engineering
---

Best practices for LLM prompt engineering
==========================================

Writing effective prompts — a process known as prompt engineering — is essential for unlocking the full potential of large language models. The goal of prompt engineering is to design inputs that guide LLMs to generate desired outputs.

Key strategies for effective prompting
---------------------------------------

### Be clear and specific

* **Be clear:** Use straightforward language. Instead of "What do you know about coding?", specify "Summarize my framework options for developing a web application."
* **Specify context:** Provide context to anchor the model's response. Example: "As a software engineer, explain the benefits of abstraction."

### Refine and iterate

* **Test and adjust:** Experiment with different prompt structures and refine based on output quality.
* **Feedback loop:** Use model feedback to continuously improve prompt design.

### Use examples

* **Demonstrate desired output:** Provide examples to set expectations for format and content. Example: "Translate the following sentence to French: 'Hello, how are you?' Example: 'Hello' translates to 'Bonjour'."
* **Highlight patterns:** Use examples to establish a consistent response pattern.

### Manage length and complexity

* **Be concise:** Provide necessary details without overloading the model. Use "Briefly describe the history of robotics" rather than asking about history, current state, and future all at once.
* **Avoid overloading:** Break complex tasks into simpler parts.

### Incorporate constraints

* **Set boundaries:** Define clear constraints. Example: "Summarize the article in no more than three sentences."
* **Limit unwanted outputs:** Use negative examples or explicit instructions. Example: "Generate a list of pros and cons of remote work, but exclude personal opinions."

### Provide relevant context

* **Align with model capabilities:** Tailor prompts to the strengths and limitations of the model.
* **Maintain relevance:** Ensure prompts are relevant to the model's training data.

### Optimize the interaction

* **Role-playing:** Assign roles to guide tone and depth. Example: "As a mechanical engineer, describe the most important sensors to deploy in a heavy manufacturing process."
* **Sequential prompting:** Use a series of prompts for complex responses. Example: "First, describe the semiconductor manufacturing process. Next, list three types of semiconductors and how they are manufactured."

Additional prompt engineering resources
-----------------------------------------

* **Anthropic:** [Prompt engineering overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
* **Google:** [Prompt engineering whitepaper](https://www.kaggle.com/whitepaper-prompt-engineering)
* **Microsoft:** [Prompt engineering techniques](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering?tabs=chat)
* **OpenAI:** [Best practices for prompt engineering with the OpenAI API](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api)
