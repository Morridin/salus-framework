# Salus Framework
[![Build Status](https://github.com/Morridin/salus-framework/actions/workflows/build.yml/badge.svg)](https://github.com/Morridin/salus-framework/actions/workflows/build.yml)

This project is intended to provide an open-source framework software for medical software to live in and be run from.
The framework is distributed with a web-based user-interface that can be used with any browser.

This user interface does not provide any relevant functionality by itself other than the ability to start plugins, similar to how one would open a browser tab.
This is intended design as this project's aim is only to provide a framework for other software to live within.

As usual with web-based applications, this framwork is split into a frontend and a backend. 
The frontend is intended to mainly do rendering tasks and present the user interface while the backend is intended for computationally heavier tasks such as calculations or chunking and caching of very large images.
For technical reaons, the backend is not entirely separate from the frontend, however, as the server that hosts the frontend and delivers it to the user's client, is the same as the backend server. 
Nevertheless, don't perform heavy calculations on the frontend as they might run directly on the user's client PC (so, within a browser).

This has a significant advantage, namely, that calling functions of the backend, which, in most other cases, requires rather complex syntax with explicit requests to the server, can just be done by calling that function from within the code, while the programming framework in use handles the rest.

For the plugins, however, this procedure stays a little bit more complex than just calling a function.
The Salus framework provides an API to the plugins living within it for the purpose of backend communication.
The API mainly relays on the postMessage API on the frontend and a specific JSON format to direct the program calls in the backend.
Plugins don't need to know how the messages are processed and transported internally, just, how to call the API.

And that's the main point of this framework: provide a platform for distributed execution of programs that takes care of authentication (not implemented yet) and network communication and gives the contained programs a rather high degree of freedom in what they do and how they work, while also providing a simple solution to the problem of designing asthetic user interfaces as web technologies are 

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

## How to start the program
Navigate to the `frontend` directory and type into the terminal the command
```bash
dx serve
```

Program will build and then run.

## Plugins
The core of this framework are plugins that introduce functionality into the program.
The Salus Image Viewer was intended to be the first and most prominent example for such plugins.
However, it was postponed until further notice to allow for a better integrated framework.

A plugin consists of a folder containing a file `plugin.json` at first hand.
Depending on type and functionality of the plugin, its folder may contain more files. 
We'll come to that later on.

When designing a plugin, you do not need to worry about naming conflicts as the framework takes care of this for you.

### The Plugin Manifest
First, we'll discuss the heartpiece of each and every plugin - its manifest file `plugin.json`, of which you can see a complete example below:
```json
{
  "name": "Test Plugin",
  "type": "dynamic",
  "source": "index.html",
  "dependencies": [],
  "panels": ["center", "all"],
  "endpoints": [
    {
      "url": "/test",
      "method": "GET",
      "handler": {
        "command": "ls",
        "default_args": ["-a"],
        "args": [
          {
            "display_name": "long",
            "name": "-l",
            "type": "flag",
            "optional": true
          }
        ]
      }
    }
  ]
}
```
The following table gives information about the keys (and their possible values) within the file:
#### `PluginManifest`
|Key|Type|Explanation/Possible Values|
|---|---|---|
|`name`|`string`|The display name of the plugin. May be anything.|
|`type`|`string`|The type of the plugin. For a detailed explanation, please refer to the Plugin Types section.<br/>Possible values: `static`, `dynamic`, `extern`, `rust`, `component`|
|`source`|`string`|The relative path to the file to use as source file for display in the browser or the URL of the webpage this plugin is.|
|`dependencies`|`list[string]`|Currently not used.<br/>In the future, it will be possible to define other plugins that are launched as a consequence of launching this plugin. Then, you put the UUIDs of the dependency plugins into this list.|
|`panels`|`list[string]`|The panel in which this plugin may be started. The key `all` is translated into a list of the other existing keys. Duplicates are allowed but don't do anything.<br/>Possible values: `all`, `right`, `left`, `center`, `bottom`|
|`endpoints`|`list[PluginEndpoint]`|The backend endpoints this plugin defines for itself. For details, see next section.|

#### `PluginEndpoint`
|Key|Type|Explanation/Possible Values|
|---|---|---|
|`url`|`string`|The URL path of the endpoint defined by this object. There is no requirement for the path to be unique, note, however that only the first endpoint with matching path and method will be considered by the backend.|
|`method`|`string`|The HTTP request method for this endpoint.<br/>Possible values: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`<br/>Currently, the only supported values are `GET` and `POST`. Please note, that the framework (more specifically, the JS `fetch` API does not support GET requests with body as [those are strongly discouraged](https://datatracker.ietf.org/doc/html/rfc9110#section-9.3.1). |
|`handler`|`CommandTemplate`|The program call that is executed when the plugin calls this endpoint. For details, see next section.|

#### `CommandTemplate`
|Key|Type|Explanation/Possible Values|
|---|---|---|
|`command`|`string`|The command to be executed. Please note that spaces within this field are treated as spaces within filenames but not as end of program name or the like!|
|`default_args`|`list[string]`|Arguments to the program call that are equal for all possible calls to this endpoint (e.g. the actual python script when having `python` as value for `command`). Default arguments are always passed before any other arguments!<br/>Please note that, usually, spaces within the command line separate arguments. Hence, split your default input accordingly, as spaces within strings are treated as escaped, literal spaces within the argument.|
|`args`|`list[CommandArgument]`|A list of commands that this endpoint requires or accepts. For details, see next section.|

#### `CommandArgument`
|Key|Type|Explanation/Possible Values|
|---|---|---|
|`display_name`|`string`|The name of the argument as query parameter or similar, hence, for the frontend of the plugin.|
|`name`|`string`|The actual name of the argument, hence what is put into the command call.|
|`type`|`string`|The type of the argument. There may be some type checking performed prior to handing the argument over to the command.<br/>The special type `flag` stands for arguments that have no value, such as the `-l` argument to `ls`. Arguments with this type are added if the key is present in the request, while the value associated with the key in the request is discarded. By their nature, arguments of `flag` type are optional.<br/>The special type `body` collects the request body into a temporary file which is then passed to the called command by its file name. Defining multiple arguments with type `body` results in undefined behaviour, so do so on your own risk.<br/>Possible Values: `string`, `int`, `float`, `bool`, `flag`, `body`|
|`optional`|`bool`|Set to true, if this argument may be omitted. Is already included within the `flag` argument type.|

### Plugin Types
Currently, there are five different plugin types defined, of which three are supported: `static`, `dynamic`, `extern`.

`static` type plugins may consist of static HTML pages without any JavaScript.

`dynamic` type plugins may consist of HTML pages without any further restriction. Especially, they are allowed to perform requests to the framework backend using JavaScript.

`extern` type plugins may consist of an external website. That website may run JavaScript and anything, however, it must allow the execution from within an `iframe`.

`rust` type plugins are thought to be Rust executables that are executed as sort of DLL's within the framework. **Currently not supported.**

`component` type plugins are thought to be web-components that are directly integrated into the frameworks user interface. **Currently not supported.**

Trying to start plugins of unsupported type will result in an error that is shown on the user interface.

### Additional files
When your plugin requires additional files, e.g. images which are included inside your HTML file or executables that are run when making calls to the backend, you must provide these within the folder where the plugin manifest resides in.

All paths provided anywhere within the plugin - be it in the plugin manifest or in any other file within the plugin folder - and with the exception of URLs to external websites - **must be RELATIVE**.
Also, they must stay within the plugin folder. 
Reaching outside is forbidden, however, this restriction is not enforced yet.
The status regarding enforcement may change at any time, without notice and may result in _a silent failure_.
Hence, it is the plugin's author's obligation to introduce measures against illegal file paths. 

### Communication with the backend
Whenever a plugin has to perform computationally heavy or difficult tasks, it should relay on the resources of the backend server instead of running such calculations within the browser window.

You can have anything as backend part of your plugin that runs on an out of the box Linux system.
If you have any special requirements, please ask your administrator to take care.

Usage of the backend server goes as follows: 
- The frontend of the plugin sends a postMessage request to the framework, which in turn, calls the backend.
- The backend calls the program specified for the respective handler, pumps in the arguments provided and collects _everything that is written into the standard output_.
- The collected output is returned to the framework and the framework relays it as is to the frontend of the plugin.

In detail:

The framework uses the [`postMessage` API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) for communication between plugins and framework in the frontend.

The plugin can make a request by calling `window.parent.postMessage(<JSON>);` with `<JSON>` being a `PluginFrontendRequest` object, see the respective section.

The framework then handles the request, as already described.

The backend will try to execute the command defined within the endpoint with all the provided arguments, and in success case return a status 200 and the contents of STDOUT in the response body.

In all other cases a corresponding HTTP status indicating an error (most likely 500, except for missing or wrong arguments, then 400) will be returned, together with a message hinting to the error source.

The framework will discard such responses silently. 
However, you can look them up in your browser console's network tab.

In success case, the framework will issue a `message` event to the iframe in which the plugin lives which needs to be collected by a corresponding event handler within the plugin.

#### `PluginFrontendRequest`
|Key|Type|Explanation/Possible Values|
|---|---|---|
|`origin`|`string`|The address of the request origin. Usually, you can just put `location.href` in there.|
|`method`|`string`|The HTTP request method for this request. For supported/allowed values, please refer to the `PluginEndpoint` object section.|
|`endpoint`|`string`|The path of the endpoint as defined within the plugin manifest.|
|`body`|`string | null`|The HTTP request body associated with this request. Currently, its type is defined as string, but in the long run, anything should be fine. If there is no body in this request, set this value to null. _Please note that some HTTP request methods do not allow request bodies._|

Example:
```json
{
  "origin": "localhost:8080",
  "method": "GET",
  "endpoint": "/test",
  "body": null
}
```

### Plugin installation
Put the collection of files forming your plugin into a folder named with some yet unused 32-bit UUID and move the folder to the directory `frontend/plugins`.

On the next Ctrl-F5 reload, you should see your plugin appear in the list of available plugins on the left of the screen.

Please note that changes to plugin files directly used by the frontend may only show after a restart of the framework due to caching.
