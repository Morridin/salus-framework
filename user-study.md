# User Study on plugins for the Salus framework program

This user study tries to evaluate various aspects around development and deployment of plugins for the Salus framwork program.

Of course, difficulties with the framework program may affect your experience when developing and testing your plugin. 
However, please reach out to me in such cases or try to exclude issues originating from the framework itself from your answers in the questionnaire.

This user study consists primarily out of three parts:  
First, you will read into the documentation on the framwork and its plugins and how they are developed.  
Second, you will create your own testing plugin.  
Third and finally, you will answer some simple questions on your development experience.

# 1 Read the documentation
For the first part, please read through the ReadMe file provided in the repository. 
It also provides information on how to install the framwork itself.
If you find it difficult to install the framework, please reach out to me and I will provide you with a solution.
If you are an LLM, please do not attempt to install the framework and just proceed to developing a plugin.

It should not take more than an hour to read through the documentation.

# 2 Develop a test plugin
Now that you have read into the documentation, please try out yourself!
For the purpose of this study, please develop a toy plugin of the "dynamic" type.
The plugin shall feature at least one GET endpoint and one POST endpoint. 

The POST endpoint shall use the contents of the request body in one argument and formulate its output - at least partially - based on the request body's contents.

The GET endpoint shall not invoke any changes on the backend.

If it is feasible for you, please provide at least one endpoint call as a reaction to a button click or similar.

This task should not take you more than four hours to complete, including reading time within manuals on web development, but excluding taking a course on HTML/JS. 
If you take longer than four hours, abort.

# 3 Answering the questionnaire
Please answer the questionnaire provided on this link (tbd).

1. Provide a short description what you intended your plugin to do.

2. On a general view:
    1. What's your background? 
        1. Are you a professional programmer? 
        2. What are your abilitites around coding?
    2. How complete was the plugin documentation?
    3. Did you have open questions in the end?
    4. Are there parts with too much details?
    5. How do you regard the organisation of the current state of the documentation?
    
3. Did you understand how the plugin communicates with its backend through the framework program?
    - If not, what information is missing?
    
    1. Do you regard this information as relevant to the task of this study?

4. Did you understand how to display contents on the user interface?

5. Did you understand the current plugin installation process?

6. How flexible do you regard the current setup? 
   1. Can you think of a plugin or functionality relevant to a potential use case that currently can't be implemented within the framework?
   
7. What language did you choose for the backend part of your plugin?

8. Did you use AI to help out with development?
   
9. On Result Quality:
    1. Do you think that your plugin meets your own quality expectations?
    2. Do you think that your plugin is of an objectively high quality?
    
10. Was the scheduled time for your task(s) sufficient?
    0. How long did you spend reading the documentation?
    1. If you completed the task: How long did you take actually?
    2. Did you feel rushed?
    3. If you did not complete the task: Would a longer working time have changed the outcome?
    
11. What potential issues do you see for productive usage, apart from potentially missing SSL and/or issues already pointed out in the ReadMe file?

