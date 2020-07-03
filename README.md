# Gather for the Python extension

A [Visual Studio Code](https://code.visualstudio.com/) [extension](https://marketplace.visualstudio.com/VSCode) that adds the experimental Gather feature to the [Python extension](https://github.com/microsoft/vscode-python). With one button click on any notebook or Interactive Window cell, Gather uses a static analysis technique to find and then copy all of the dependent code that was used to generate that cell's result into a new notebook or script. 

Please note that the Python analysis is quite conservative, so if it is unsure whether a line of code is necessary for execution, it will err on the side of including it in the new notebook/script. We are keen to understand how well this feature works for you so please let us know if you are satisfied with the results you are getting through the survey presented at the top of each gathered file.

## Quick start

- **Step 1.** Install both the Python and the Gather extension for Visual Studio Code.

    <img src=./images/step1.PNG>

- **Step 2.** Use the Interactive Window or Notebook Editor to do your work.

    <img src=./images/step2.PNG>

- **Step 3.** When you're satisfied with a cell's output, click the Gather icon <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path style="fill: currentColor !important; fill-rule: evenodd !important; clip-rule: evenodd !important" d="M1.5,1,1,1.5v3l.5.5h3L5,4.5v-3L4.5,1ZM2,4V2H4V4ZM1.5,6,1,6.5v3l.5.5h3L5,9.5v-3L4.5,6ZM2,9V7H4V9ZM1,11.5l.5-.5h3l.5.5v3l-.5.5h-3L1,14.5ZM2,12v2H4V12ZM12.5,5l-.5.5v6l.5.5h3l.5-.5v-6L15.5,5ZM15,8H13V6h2Zm0,3H13V9h2ZM9.1,8H6V9H9.1l-1,1,.7.6,1.8-1.8V8.1L8.8,6.3,8.1,7Z"/>
  </svg> to build a new notebook or script that generates that same output.

    <img src=./images/step3.PNG>
    
## Additional Information
Gather uses a set of files called "specs" that are used to identify whether each function provided in a Python package modifies kernel state. Currently, the packages that are fully supported are:
- matplotlib
- numpy
- pandas
- random
- sklearn
- a set of built-in Python functions/keywords 

It is possible to add packages or api's to the supported list on your local installation. If you are interested in doing this for your own private work, or would like to  contribute to the community to support other popular Python packages, please [let us know](https://github.com/Microsoft/vscode-python)! 

## Questions and issues

- If you come across a problem, please [file an issue](https://github.com/microsoft/vscode-python).
- If you have a question about how to accomplish something with the extension, please [ask on Stack Overflow](https://stackoverflow.com/questions/tagged/visual-studio-code+python)
- Any and all feedback is appreciated and welcome!
  - If someone has already [filed an issue](https://github.com/Microsoft/vscode-python) that encompasses your feedback, please leave a 👍/👎 reaction on the issue
  - Otherwise please file a new issue
