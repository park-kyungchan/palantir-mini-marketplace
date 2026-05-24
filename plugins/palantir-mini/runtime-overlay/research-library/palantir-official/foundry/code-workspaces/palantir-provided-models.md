---
sourceUrl: "https://www.palantir.com/docs/foundry/code-workspaces/palantir-provided-models/"
canonicalUrl: "https://palantir.com/docs/foundry/code-workspaces/palantir-provided-models/"
sourceLastmod: "2026-05-12T17:06:26.154Z"
fetchedAt: "2026-05-12T23:57:50.244Z"
fetcher: "palantir-mini import-palantir-official-docs"
extractor: "next-data-markdown"
contentHash: "9c6a49371e55f705b04ffa70672006d42f44e6e8df7d511c64c41c6f0a0f3b1a"
product: "foundry"
docsArea: "code-workspaces"
locale: "en"
upstreamTitle: "Documentation | Code Workspaces > Palantir-provided models"
licenseNote: "Local evidence mirror of public Palantir documentation. Use for routing and citation; do not republish as a standalone corpus."
---
# Use Palantir-provided language models within Jupyter® notebooks

:::callout{theme="neutral" title="Prerequisites"}
To use Palantir-provided language models, [AIP must first be enabled on your enrollment](/docs/foundry/aip/enable-aip-features/).
:::

Palantir provides a [set of language and embedding models](/docs/foundry/aip/supported-llms/) which can be used within Jupyter® notebooks. The models can be used through the `palantir_models` library. This library provides a set of classes that provide bindings to interact with the models.

## Palantir-provided model setup in Code Workspaces

To add language model support to your notebook, open the packages search panel on the left side of your Code Workspace. Search for `palantir_models`, then choose **Latest**. This will copy an install command to your clipboard, which you can then paste into an empty cell and run.

## Add a Palantir-provided model to your notebook

To add a language model to your notebook, open the **Models** panel on the left side of your Code Workspace. If you haven't already imported a model, click **Import a Palantir-provided model**. If you have already imported a model, you can import additional models by selecting the **+** icon at the top of the panel.

The panel will then show you a searchable list of models that are available to you. Models are listed in two categories: chat completion models and embedding models. Select the desired model to import it into your Code Workspace.

![List of available models](/docs/resources/foundry/code-workspaces/import-language-model-list.png)

:::callout{theme="neutral"}
Model availability may differ between customers. For more information, contact your Palantir representative.
:::

After import, your model will appear in the **Models** panel. Selecting the model in the **Models** panel will display a code snippet demonstrating basic functionality for the model.

![Language model code snippet](/docs/resources/foundry/code-workspaces/lanugage-model-snippet.png)

To get started with the model, click the snippet to copy the code and paste into any cell in your notebook.

### Using the language model to generate completions

In this example, we will use an OpenAI model to answer a question. Assuming you have already imported a model, you can copy the code snippet below into any cell to proceed.

```python
from language_model_service_api.languagemodelservice_api_completion_v3 import GptChatCompletionRequest
from language_model_service_api.languagemodelservice_api import ChatMessage, ChatMessageRole
from palantir_models.models import OpenAiGptChatLanguageModel

model = OpenAiGptChatLanguageModel.get("gpt_v4")
response = model.create_chat_completion(GptChatCompletionRequest([ChatMessage(ChatMessageRole.USER, "why is the sky blue?")]))
```

## Embeddings

Along with generative language models, Palantir also provides embedding models. The following example shows how we can use an embedding model to calculate embeddings for a list of words, and plot the embeddings to visualize them. Each code block below should be treated as its own cell.

First, add the dependencies needed for this example:

```python
!mamba install -y "palantir_models>=0.1795.0" matplotlib numpy scikit-learn
```

Then make sure you have imported an embedding model in the **Models** panel. In this example, we will use OpenAI's `text-embedding-ada-002` model.

![Imported embedding model](/docs/resources/foundry/code-workspaces/embedding-model-in-panel.png)

To generate the desired embeddings, we start with a copy of the model snippet and make some modifications as shown below:

```python
from language_model_service_api.languagemodelservice_api_embeddings_v3 import GenericEmbeddingsRequest
from palantir_models.models import GenericEmbeddingModel

fruits = [
    "apple", "banana", "orange", "melon", "kiwi", "pear", "grape", "strawberry", "lemon", "lime",
    "blueberry", "berry", "mango", "watermelon"
]
animals = [
    "dog", "cat", "cow", "eagle", "mouse", "horse", "squirrel", "lion", "deer", "goose", "chicken", "pig"
]
words = fruits + animals

model = GenericEmbeddingModel.get("text-embedding-ada-002")
embeddings = model.create_embeddings(GenericEmbeddingsRequest(inputs=words)).embeddings
```

Finally, we can use scikit-learn and Matplotlib to visualize our embeddings:

```python
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import numpy as np

pca = PCA(n_components=2, random_state=0)
embeddings_2d = pca.fit_transform(np.array(embeddings))

plt.figure(figsize=(8, 4), dpi=100)
for i, word in enumerate(words):
    x, y = embeddings_2d[i, 0], embeddings_2d[i, 1]
    plt.scatter(x, y)
    plt.annotate(word, xy=(x, y), xytext=(5, 2), textcoords='offset points', ha='right', va='bottom')
plt.show()
```

After running the notebook, you will be presented with a graph of the embeddings:

![Embedding model graph](/docs/resources/foundry/code-workspaces/embedding-model-graph.png)

***

*Jupyter®, JupyterLab®, and the Jupyter® logos are trademarks or registered trademarks of NumFOCUS.*

All third-party trademarks (including logos and icons) referenced remain the property of their respective owners. No affiliation or endorsement is implied.
