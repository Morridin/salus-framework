# Salus Image Viewer

This project is intended to provide an open-source framework software for medical software to live in and be run from.
The framework is distributed with a web-based user-interface that can be used with any browser.

## Installation
Note: Subject to change - as soon as I made a release version of the framework program.

Until then, first download the framework program from its repository.
Then get yourself an up-to-date Rust version (see here: https://rust-lang.org).

If you are on Windows, for your own sanity, install Rust inside a WSL container and start the program from within the WSL.

Then, install Dioxus following these steps:
```bash
rustup toolchain install stable
rustup target add wasm32-unknown-unknown

curl -sSL https://dioxus.dev/install.sh | bash
```

You might need to install some additional dependencies, but only do so if you see errors while running the program.
For reference on the additional dependencies and their installation, please refer here: [Dioxus](https://dioxuslabs.com/learn/0.7/getting_started/#platform-specific-dependencies)

## Start the program
Navigate to the `frontend` directory and type into the terminal the command
```bash
dx serve
```

Program will build and then run.

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
    "endpoints": [
      {
        "url": str,
        "method": str,
        "handler": {
          "command": str,
          "default_args": [str],
          "args": [
            {
              "display_name": str,
              "name": str,
              "type": "string" | "int" | "float" | "bool" | "flag" | "body",
              "optional": bool
            }
          ]
        }
      }
    ]
  }
  ```
  Not all values are supported yet, namely: `rust` and `component` for `type`.
  Unsupported values for `type` result in an error that is shown when starting the plugin.
  
  The value `"all"` for the `panels` key includes all other options. 
  You can note down allowed panels multiple times, though that won't have any effect as opposed to noting a panel once or implicitly via `"all"`.
  The value in `dependencies` is ignored at the moment.
- The file provided in `source` must exist at the given location, if it is a local file. 
  Depending on the value in `type`, the file is expected to be of a certain type:  
  - `static`, `dynamic`: HTML. `dynamic` Allows for the execution of JavaScript within the plugin, `static` does not.
  - `extern`: URL.
  - `component`: A file containing a valid web-component.
  - `rust`: Rust source file (.rs)
- You must provide any additional files that the file you provide in `source` depends on (graphics, styles, etc.) within the directory of the plugin.
- Any paths within the file given in `source` must be relative and must not reach outside the directory the plugin resides in. 
  Please note that the framework doesn't check this yet. 
  This might change in the future as not checking this is insecure.
  Even if the framework starts to check paths to be valid, it is likely that it will NOT inform the plugin about errorneous file paths and fail silently.
  It is the plugin author's obligation to introduce measures against illegal file paths.
- If the plugin wants to communicate with code in the backend, it must use a message passing interface provided by the framework.
  - The request must be made by calling `window.parent.postMessage(<JSON>);`
    Regarding the postMessage interface, please read up on MDN.
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
  - In order to generate the required endpoint paths on the backend, the plugin needs to provide an object each per Path within the `enpoints` array in the `plugin.json` file.
    - This object specifies the HTTP method (`method`) and path on which the endpoint will appear on the backend (`path`).
    - Also, by the key `handler` it specifies, which code the backend executes when the endpoint is called.
      The key `command` provides the "path" to the executable to run. Spaces within `command` are treated as spaces within the pathname.
      The key `default_args` lets you specify a list of strings that are added as arguments to the program specified by `command` everytime that endpoint is called. 
      Please note that, usually, spaces within the command line separate arguments. Hence, split your default input accordingly, as spaces within strings are treated as escaped, literal spaces within the argument.
      In the following, the variable arguments as specified within the list `args` is appended in no particular order (apart from the argument name always preceding the argument value)
      The following argument types are available: String, Integer, Float, Boolean, Flag and Body.
      The Flag type stands for arguments that require no value (such as `-a` in `ls`). 
      The Body type can be used exactly once to capture the contents of the request body of POST requests into a temp file that is then handed over as path to the command.
      The backend will try to execute `command` with all the provided arguments, and in success case return the contents of STDOUT and else an error message (most likely 500, except for missing or wrong arguments, then 400).
  - The developer is solely responsible for the format and handling of their plugin's messages.
  - The developer does not need to take any precautions against naming conflicts with other plugins. However, please be aware of the aforementioned topic of file path validity.
  - The backend part of the plugin can be anything that is executable on a linux system.
    The backend part resides next to the other files of the plugin.
  
### Plugin installation
Put the collection of files forming your plugin into a folder named with some yet unused 32-bit UUID and move the folder to the directory `frontend/plugins`.

On the next Ctrl-F5 reload, you should see your plugin appear in the list of available plugins on the left of the screen.

Please note that changes to plugin files directly used by the frontend may only show after a restart of the framework due to caching.
