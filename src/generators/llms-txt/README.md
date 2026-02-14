## `llms-txt` Generator

The `llms-txt` generator creates a `llms.txt` file to provide information to Large Language Models (LLMs) at inference time, containing links to all API documentation.

### Configuring

The `llms-txt` generator accepts the following configuration options:

| Name           | Type     | Default                 | Description                                    |
| -------------- | -------- | ----------------------- | ---------------------------------------------- |
| `output`       | `string` | -                       | The directory where `llms.txt` will be written |
| `templatePath` | `string` | `'template.txt'`        | Path to the template file                      |
| `baseURL`      | `string` | Inherited from `global` | Base URL for generating documentation links    |
