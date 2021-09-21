# Gather for the Jupyter extension

A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that adds the experimental Gather feature to the [Jupyter extension](https://github.com/microsoft/vscode-jupyter) on Python code. With one button click on any notebook or Interactive Window cell, Gather uses a static analysis technique to find and then copy all of the dependent code that was used to generate that cell's result into a new notebook or script.

Please note that the Python analysis is quite conservative, so if it is unsure whether a line of code is necessary for execution, it will err on the side of including it in the new notebook/script. We are keen to understand how well this feature works for you so please let us know if you are satisfied with the results you are getting through the survey presented at the top of each gathered file.

## Quick start

- **Step 1.** Install both the Jupyter and the Gather extension for Visual Studio Code.

    <img src=https://raw.githubusercontent.com/microsoft/vscode-gather/main/images/step1.PNG>

- **Step 2.** Run cells on the Interactive Window or Notebook Editor to do your work.

    <img src=https://raw.githubusercontent.com/microsoft/vscode-gather/main/images/step2.PNG>

- **Step 3.** When you're satisfied with a cell's output, click the Gather icon to build a new notebook or script that generates that same output.

    <img src=https://raw.githubusercontent.com/microsoft/vscode-gather/main/images/step3.PNG>

## Additional Information

Gather uses a set of files called "specs" that are used to identify whether each function provided in a Python package modifies kernel state. Currently, the packages that are fully supported are:

- matplotlib
- numpy
- pandas
- random
- sklearn
- a set of built-in Python functions/keywords

It is possible to add packages or APIs to the supported list on your local installation. If you are interested in doing this for your own private work, or would like to contribute to the community to support other popular Python packages, please [let us know](https://github.com/microsoft/vscode-jupyter)!

## Questions and issues

- If you come across a problem, please [file an issue](https://github.com/microsoft/vscode-jupyter).
- If you have a question about how to accomplish something with the extension, please [ask on Stack Overflow](https://stackoverflow.com/questions/tagged/visual-studio-code+jupyter)
- Any and all feedback is appreciated and welcome!
  - If someone has already [filed an issue](https://github.com/microsoft/vscode-jupyter) that encompasses your feedback, please leave a 👍/👎 reaction on the issue
  - Otherwise please file a new issue
