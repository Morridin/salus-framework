# Salus Image Viewer

This project is intended to provide an open-source framework software for medical software to live in and be run from.
The framework is distributed with a web-based user-interface that can be used with any browser.

## Plugins
The core of this framework are plugins that introduce functionality into the program.
The Salus Image Viewer was intended to be the first and most prominent example for such plugins.
However, it was postponed until further notice to allow for a better integrated framework.

In order to work as a plugin, code must meet the following requirements:
- It must contain a `plugin.json` file adhering to the following structure:
  ```JS
  {
    "name": str,
    "type": "static" | "dynamic" | "extern" | "rust" | "component",
    "source": str,
    "dependencies": [str],
    "panels": ["right" | "left" | "bottom" | "center" | "all"],
    "routes": [
        {
            "method":str,
            "path":str,
            "handler": str
        }
    ]
  }
  ```
  Not all values are supported yet, namely: `rust` and `component` for `type` and `all` and `left` in the first position of `panels`.
  Please note, that, currently, only the first value of `panels` is processed and all other ignored.
  In case of `type`, unsupported values generate an error, while in case of `panels`, the plugin just won't be rendered.
- The file provided in `source` must exist at the given location, if it is a local file. 
  Depending on the value in `type`, the file is expected to be of a certain type:  
  - `static`, `dynamic`: HTML. `dynamic` Allows for the execution of JavaScript within the plugin, `static` does not.
  - `extern`: URL.
  - `component`: A file containing a valid web-component.
  - `rust`: Rust source file (.rs)
- Any additional files that the file you provide in `source` depends on (graphics, styles, etc.)
- Any paths within the file given in `source` must be relative and must not reach outside the directory the plugin resides in.
- If the plugin wants to communicate with code in the backend, it must use a message passing interface provided by the framework.
  - The request must be made by calling `window.parent.postMessage(<JSON>);`
  - The JSON has to look like so: 
    ```JS
    {
      "origin": str,
      "method": str,
      "endpoint": str,
      "body": str | null
    }
    ```
    - Usually, `origin` should be set to `location.href`.
    - `method` must be a valid HTTP method which is implemented for `endpoint`.
    - `endpoint` must be a path existing on the backend (see later).
    - The content of `body` is up to the plugin developer. Note, however, that some HTTP requests do not allow bodies.
  - In order to generate the required endpoint paths on the backend, the plugin needs to provide an object each per Path within the `routes` array in the `plugin.json` file.
    - This object specifies the HTTP method (`method`) and path on which the endpoint will appear on the backend (`path`).
    - Also, by the key `handler` it specifies, which code the backend executes when the endpoint is called.
      This can be either a path to a file or any command.
      The backend will first check if `handler` is a file and, if so, execute it, if executable, else simply send the file's contents.
      If `handler` is a command instead, the backend will try to execute it with a timeout of n (tbd) seconds.  
      If the program returns with code 0, everything printed to standard output will be sent to the frontend, else everything printed to standard error output.
  - The developer is solely responsible for the format and handling of their plugin's messages.
  - The developer does not need to take any precautions against conflicts with other plugins.
### Plugin installation
Put the collection of files forming your plugin into a folder named with some yet unused 32-bit UUID and move the folder to the directory `frontend/plugins`.

On the next Ctrl-F5 reload, you should see your plugin appear in the list of available plugins on the left of the screen.
 
## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
