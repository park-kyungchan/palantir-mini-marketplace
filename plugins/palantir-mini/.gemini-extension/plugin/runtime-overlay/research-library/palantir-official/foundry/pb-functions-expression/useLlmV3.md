---
sourceUrl: "https://www.palantir.com/docs/foundry/pb-functions-expression/useLlmV3/"
canonicalUrl: "https://palantir.com/docs/foundry/pb-functions-expression/useLlmV3/"
sourceLastmod: "2026-05-12T17:06:26.150Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "bf4736650cb7e4062aa9bf394e5e812ffd0b919af6f6609eb97092573cfdaea2"
product: "foundry"
docsArea: "pb-functions-expression"
locale: "en"
upstreamTitle: "Documentation | Pipeline Builder Expressions > Use LLM"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use LLM

> Supported in: Batch, Faster

Call an LLM with a configurable prompt.

**Expression categories:** String

## Declared arguments

* **Model:** The LLM model to use.<br>*Model*
* **Prompt:** The user prompt for an LLM model. Media items can also be used as prompts. Images and PDFs are supported. PDFs will be converted to a list of images before being passed to the LLM. If the entire prompt is empty or null, the output will be null. However, if individual columns in the prompt are null, they will be treated as <null>.<br>*List\<Expression\<AnyType>>*
* **System prompt:** The system prompt to pass to an LLM model. Media references are not supported in the system prompt.<br>*List\<Expression\<AnyType>>*
* *optional* **Output mode:** Choose to output as a simple output where the output is the type of the output type parameter and errors are returned as null, or output a struct with the output the output type and error as fields.<br>*Enum\<Simple, With errors>*
* *optional* **Output type:** The output type LLM responses should adhere to.<br>*Type\<Array\<AnyType> | Boolean | Date | Decimal | Double | Float | Integer | Long | Short | String | Struct | Timestamp>*

**Output type:** *Array\<AnyType> | Boolean | Date | Decimal | Double | Float | Integer | Long | Short | String | Struct | Struct\<ok:Array\<AnyType> | Boolean | Date | Decimal | Double | Float | Integer | Long | Short | String | Struct | Timestamp, error:String> | Timestamp*

## Examples

### Example 1: Base case

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** `prompt`
* **System prompt:** \[In the context of a food delivery app, your job is to rate reviews given in the following user promp...]
* **Output mode:** *null*
* **Output type:** *null*

| prompt | **Output** |
| ----- | ----- |
| The food was great! | 5 |

***

### Example 2: Base case

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** \[`prompt`, `mediaRef`]
* **System prompt:** \[You are a highly advanced AI designed to assist healthcare professionals by interpreting medical ima...]
* **Output mode:** *null*
* **Output type:** *null*

| prompt | mediaRef | **Output** |
| ----- | ----- | ----- |
| Patient: John Doe, Age: 45, Symptoms: Persistent cough, shortness of breath, and chest pain. Please analyze the attached chest X-ray for any signs of pneumonia or other abnormalities. | {"mimeType":"image/jpeg","reference":{"type":"mediaSetViewItem","mediaSetViewItem":{"mediaSetRid":"r... | Diagnostic Report:<br><br>Patient: John Doe<br>Age: 45<br>Symptoms: Persistent cough, shortness of b... |

***

### Example 3: Null case

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** `prompt`
* **System prompt:** *null*
* **Output mode:** *null*
* **Output type:** *null*

| prompt | **Output** |
| ----- | ----- |
| *null* | *null* |

***

### Example 4: Null case

**Description:** Only MediaSet Reference, without a prompt, should have a null output.

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** `mediaRef`
* **System prompt:** *null*
* **Output mode:** *null*
* **Output type:** *null*

| mediaRef | **Output** |
| ----- | ----- |
| {"mimeType":"image/jpeg","reference":{"type":"mediaSetViewItem","mediaSetViewItem":{"mediaSetRid":"r... | *null* |

***

### Example 5: Edge case

**Description:** Empty input string should have a null output.

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** `prompt`
* **System prompt:** *null*
* **Output mode:** *null*
* **Output type:** *null*

| prompt | **Output** |
| ----- | ----- |
| *empty string* | *null* |

***

### Example 6: Edge case

**Description:** Input prompt surpassing model limits should have a null output.

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** `prompt`
* **System prompt:** *null*
* **Output mode:** *null*
* **Output type:** `WITH_ERRORS`

| prompt | **Output** |
| ----- | ----- |
| What is the capital of France? | {<br> **error**: *null*,<br> **ok**: Paris,<br>} |
| a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a ... | {<br> **error**: Context limit exceeded.,<br> **ok**: *null*,<br>} |

***

### Example 7: Edge case

**Description:** Input prompt surpassing model limits should have a null output.

**Argument values:**

* **Model:** <br>gpt4ChatModel(<br> temperature: 0.0,<br>)
* **Prompt:** `prompt`
* **System prompt:** *null*
* **Output mode:** *null*
* **Output type:** *null*

| prompt | **Output** |
| ----- | ----- |
| a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a a ... | *null* |

***
