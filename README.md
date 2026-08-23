# Salus Framework
[![Build Status](https://github.com/Morridin/salus-framework/actions/workflows/build.yml/badge.svg)](https://github.com/Morridin/salus-framework/actions/workflows/build.yml)

This project is intended to provide an open-source framework for medical software to live in and be run from.
The framework is distributed with a web-based user-interface that can be used with any modern browser.

By design, the Salus framework's user interface does not provide any relevant functionality by itself other than 
the ability to start plugins similar to how one would open a browser tab.
For future versions, we plan to integrate user authentication into the framework's functionalities.

As usual for web-based applications, this framework is split into a frontend and a backend. 
The frontend is intended to mainly perform rendering tasks and present the user interface while the backend is 
intended for computationally heavier tasks such as calculations or chunking and caching of very large images.
For technical reasons, the backend is not entirely separate from the frontend.
The server that hosts the frontend and delivers it to the user's browser is the same as the backend server. 

This architectural approach with two separate application parts has the significant advantage that calling functions of 
the backend can just be done by calling that function from within the code, while Dioxus, the framework powering Salus, 
handles the rest.
Normally such actions require rather complex syntax with explicit requests to the server and similarly intricate code in
the backend side handler.

For the plugins, however, this procedure stays a little bit more complex than just calling a function.
The Salus framework provides an API to the plugins living within it for the purpose of backend communication.
The API mainly relays on the `postMessage` API on the frontend and a specific JSON format to direct the program calls 
in the backend.
Plugins don't need to know how the messages are processed and transported in the framework, but only how to call the API.

And that's the main point of this framework: provide a platform for distributed execution of programs that takes care of 
authentication (not implemented yet) and network communication and gives the contained programs a rather high degree of 
freedom in what they do and how they work, while also providing a simple solution to the problem of designing aesthetic 
user interfaces.

## Installation
**Note**: We plan to provide the framework as ready-to-use binary files starting from version 0.2.
This section will be amended accordingly and stay only relevant for people wanting to develop on the framework. 

Until then, first download the framework program from [its repository](https://github.com/Morridin/salus-framework).

Then get yourself an up-to-date Rust version (see here: <https://rust-lang.org>).
Follow the instructions on the website to install Rust.
If you are on Windows, for your own sanity, install Rust inside a WSL container and start the program from within the WSL.

Then, install Dioxus by executing these steps in a terminal:
```bash
rustup toolchain install stable
rustup target add wasm32-unknown-unknown

curl -sSL https://dioxus.dev/install.sh | bash
```

You might need to install some additional dependencies, but only do so if you see errors while 
building and running the program.
For reference on the additional dependencies and their installation, please refer to the [Dioxus website](https://dioxuslabs.com/learn/0.7/getting_started/#platform-specific-dependencies).

## How to start the program
Navigate to the `frontend` directory and type into the terminal the command
```bash
dx serve
```

The Salus framework will build and then run.

## Plugins
The core of this framework are plugins that introduce functionality into the program.
The Salus Image Viewer was intended to be the first and most prominent example for such a plugin.
However, it was postponed until further notice to allow for a better integrated framework.

A plugin generally consists of a collection of one or more files centered around a manifest file named `plugin.json`.
That manifest controls all properties of the plugin, starting with its name, over the frontend entry point to
The plugin manifest is always at the root level of a plugin's file tree.
Depending on the plugin's design and properties, there may be additional files present in the same directory as the 
manifest or its child directories.
In the following image, you can see the file structure of our sample plugin that we will discuss in-depth in the
final section of this document.

For now, we will focus on the plugin manifest and other technical details required to understand and 
develop your own plugins for the Salus framework.

### The Plugin Manifest
First, we'll discuss the heartpiece of each and every plugin - its manifest file `plugin.json`, of which you can see 
a complete schematic below:
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
The following tables provide information about the objects (and their possible values) serialised within the file:

#### `PluginManifest`
This is the root element of the manifest file.

| Key            | Type                   | Explanation/Allowed Values                                                                                                                                                                                                                                                                      |
|----------------|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`         | `string`               | The display name of the plugin. May be any valid UTF-8 string.                                                                                                                                                                                                                                 |
| `type`         | `string`               | The type of the plugin. The meaning of each type is covered in the Plugin Types section later in this document.<br/>Allowed values: `static`, `dynamic`, `extern`, `rust`, `component`                                                                                                        |
| `source`       | `string`               | The path to the file that serves as the plugin's entry point when displayed in the framework's frontend, relative to the manifest.<br/>Alternatively, you can set this value to the URL of any website serving the same purpose.                                                              |
| `dependencies` | `list[string]`         | Currently not used.<br/>In the future, it will be possible to define other plugins that are launched as a consequence of launching this plugin. Then, you put the UUIDs of these dependency plugins into this list.                                                                          |
| `panels`       | `list[string]`         | The panel(s) in which this plugin may be started. The key `all` is translated into a list of the other existing keys. Duplicates, are allowed but won't have any effect. The same goes for anything outside the allowed values.<br/>Allowed values: `all`, `right`, `left`, `center`, `bottom` |
| `endpoints`    | `list[PluginEndpoint]` | The backend endpoints this plugin defines for itself. For details, see next section.                                                                                                                                                                                                          |

#### `PluginEndpoint`
These objects each define a plugin endpoint that can be accessed through the framework's API.  

| Key       | Type              | Explanation/Allowed Values                                                                                                                                                                                                                                                                                                                         |
|-----------|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `url`     | `string`          | The URL path of the endpoint defined by this object. There is no requirement for the path to be unique, however, note that only the first endpoint with matching path and method will be considered by the backend.                                                                                                                               |
| `method`  | `string`          | The HTTP request method for this endpoint.<br/>Allowed values: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`<br/>Please note that the framework (more specifically, the JS `fetch` API) enforces the recommendations of [RFC-9110](https://datatracker.ietf.org/doc/html/rfc9110#section-9.3.1), and disallows `GET` requests with request body. |
| `handler` | `CommandTemplate` | The program call to be executed when the plugin calls this endpoint. For details, see next section.                                                                                                                                                                                                                                               |

#### `CommandTemplate`
This type is the wrapper for a program call that the framework's backend will perform on behalf of a plugin. 
For all values contained inside the `CommandTemplate`, spaces are treated as sort of escaped, and so as part of the 
program or argument name, or corresponding value.
The arguments list of the executed program will have the value in `command` in the first entry, followed by the entries 
of `default_args` followed by entries for each element in `args`.

| Key            | Type                    | Explanation                                                                                                                                                                                                                                  |
|----------------|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `command`      | `string`                | The command to be executed. Please note that spaces within this field are treated as spaces within filenames but not as end of program name or the like!                                                                                     |
| `default_args` | `list[string]`          | Arguments to the program call that are equal for all possible calls to this endpoint (e.g. the actual python script when having `python` as value for `command`). The framework always passes default arguments before any other arguments!  |
| `args`         | `list[CommandArgument]` | A list of commands that this endpoint requires or accepts. For details, see next section.                                                                                                                                                    |

#### `CommandArgument`
This type provides the relevant information for the backend to process the plugin program's arguments correctly.
Depending on the value type, each filled argument will result in one or two list entries in the arguments list of the 
executed program. 
The first entry is always the value in `name`.
Depending on the value type, the second value is omitted or filled with either a temporary file path or the value 
provided to the backend handler via the query string.

The dynamic arguments represented by this type are evaluated by iterating over the owning `CommandTemplate`'s `args` field.
Hence, you cannot reuse a `CommandArgument` to have a program take multiple arguments of the same name (with possibly
different values).
However, you can have multiple `CommandArgument` objects consuming the same value from the request's query string!

| Key            | Type     | Explanation/Allowed Values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|----------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `display_name` | `string` | The name of the argument in the plugin's frontend. This value will be used as key in the query string when calling the associated endpoint. Duplicate keys in the query string will result in parsing errors in the backend.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `name`         | `string` | The actual name of the argument, or what is put into the command call, including all dashes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `type`         | `string` | The type of the argument. The framework validates `int`, `float` and `bool` type arguments and aborts the program call on failure.<br/>The special type `flag` stands for arguments that have no value, such as `-l` in `ls -l`. Arguments with this type are added if the key is present in the request, while any value associated with the key in the request is discarded. By their nature, arguments of `flag` type are optional.<br/>The special type `body` collects the request body into a temporary file which is then passed to the called command by its file name. Defining multiple arguments with type `body` results in undefined behaviour, so do so on your own risk. As `body` type argument values are not sent in the query string, their `display_name` is irrelevant.<br/>Possible Values: `string`, `int`, `float`, `bool`, `flag`, `body` |
| `optional`     | `bool`   | Set to true, if this argument may be omitted. Is already included within the `flag` argument type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

A `CommandArgument` object defined as such:
```json
{
  "display_name": "q",
  "name": "Question",
  "type": "string",
  "optional": false
}
```
would show up as `?q=of%20Life%2C%20the%20Universe%2C%20and%20Everything` (or with a leading `&` instead of the question
mark) in the query string of the request, provided, the value transmitted for this argument was "of Life, the Universe, 
and Everything". 

As the argument has `string` type, its validation always succeeds and it is appended like so to the plugin's program 
call: `Question "of Life, the Universe, and Everything"` (or rather as list slice consisting of `Question` and `of Life,
the Universe, and Everything`).
If the argument's validation had failed or the argument wasn't there at all, the framework would exit here and provide a 
status 400 response indicating the cause with a standardised, JSON-formatted message. 

### Plugin Types
Currently, there are five different plugin types defined, of which three are supported: `static`, `dynamic`, `extern`.

- `static` type plugins may consist of static HTML pages without any JavaScript.
- `dynamic` type plugins may consist of HTML pages without any further restriction. Especially, they are allowed to 
  perform requests to the framework backend using JavaScript.
- `extern` type plugins may consist of an external website. That website may run JavaScript and anything, however, it 
  must allow the execution from within an `iframe`.
- `rust` type plugins are thought to be Rust executables that are executed as sort of DLL's within the framework. 
  **Currently not supported.**
- `component` type plugins are thought to be web-components that are directly integrated into the frameworks user 
  interface. **Currently not supported.**

Trying to start plugins of unsupported or unknown type will result in an error that is shown on the user interface.

### Additional files
When your plugin requires additional files, e.g. images which are included inside your HTML file or executables that 
are run when making calls to the backend, you must provide them together with the plugin manifest in the same folder.

Except for URLs to external websites, all paths provided anywhere within the plugin **must be RELATIVE** to this exact 
folder where the plugin's manifest resides in.
This affects all paths provided, regardless if in the plugin manifest or in any other file within the plugin folder.
Especially, you cannot rely on any folder name or path elements closer to root than your plugin manifest.
E.g. the entry point file `index.html` residing at the plugin folder's root would be referenced exactly as `index.html`.

In addition to being relative to the plugin manifest, paths provided within a plugin must not reach outside the 
plugin folder. 
Reaching outside is forbidden, however, this restriction is not enforced yet.
The status regarding enforcement may change at any time, without notice and may result in _a silent failure_.
Hence, it is the plugin's author's obligation to introduce measures against illegal file paths. 

For long-term stability, please provide your plugin's backend executables as standalone binaries that don't require 
external dependencies to run. E.g., if your plugin needs python, provide a working python instance with your plugin.

### Communication with the backend
Whenever a plugin has to perform computationally heavy or difficult tasks, it should relay on the resources of the 
backend server instead of running such calculations within the browser window.

You can have anything as backend part of your plugin that is self-contained and runs on an out-of-the-box Linux system.
If you have any special requirements, please ask your administrator to take care.

Usage of the backend server goes as follows: 
- The frontend of the plugin sends a `postMessage` request to the framework's frontend, which in turn, calls the 
  backend.
- The backend calls the program specified for the respective handler, pumps in the arguments provided and collects 
  _everything that is written into the standard output_.
- The collected output is returned to the framework and the framework relays it as is to the frontend of the plugin.

In detail:

The framework uses the [`postMessage` API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) for communication with plugins in the frontend.

The plugin can initialise a request by calling `window.parent.postMessage(<JSON>);` with `<JSON>` being a serialised 
`PluginFrontendRequest` object, see the respective, following section.

The framework then handles the request by unpacking the JSON, and assembling an HTTP request from its contents.

The backend will try to execute the command defined within the endpoint with all the provided arguments, and 
in success case return a status 200 and the contents of STDOUT in the response body.

In all other cases a corresponding HTTP status indicating an error will be returned, together with a message hinting to 
the error source. 
In case the plugin's backend program returned with a non-zero status code, a status 500 is responded, together with 
the contents of the program's output to `stderr`.

All response bodies are relayed to the plugin frontend by calling `postMessage` on the plugin's `iframe`.
The result is a `message` event in the plugin frontend that contains the response, usually as plain text, in its 
`data` attribute.
It can be collected with a corresponding event handler.
Due to an implementation flaw, valid JSON is deserialised between extraction from the HTTP response and 
arrival as `message` event at the plugin.
As a result, all messages containing valid JSON arrive as objects instead of strings!
This is especially relevant to error messages, which are JSON formatted by the backend, but also if your plugin
communicates with JSON-based messages by default.

#### `PluginFrontendRequest`
| Key        | Type             | Explanation/Allowed Values                                                                                                                                                                                                                                                       |
|------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `origin`   | `string`         | The address of the request origin. Put the value of `location.href` here, except for the case of `extern` type plugins. In this case you need to find a way to provide the plugin manifest's path instead.                                                                     |
| `method`   | `string`         | The HTTP request method for this request. For supported/allowed values, please refer to the `PluginEndpoint` object section.                                                                                                                                                     |
| `endpoint` | `string`         | The path of the endpoint as defined within the plugin manifest.                                                                                                                                                                                                                 |
| `body`     | `string \| null` | The HTTP request body associated with this request. Currently, its type is defined as string, but in the long run, anything should be fine. If there is no body in this request, set this value to null. _Please note that some HTTP request methods discourage request bodies._ |

Example:
```json
{
  "origin": "http://localhost:8080/files/plugins/0042/index.html",
  "method": "GET",
  "endpoint": "/test",
  "body": null
}
```

### General Design Information
When designing a plugin, you do not need to worry about naming conflicts with other plugins.
The framework takes care of this for you and isolates plugins from each other.
This is also the main reason, why reaching out of a plugins directory is prohibited and 
may stop working without prior notice.

Never perform heavy calculations in the plugin's frontend. 
They will run directly on the user's browser with all the disadvantages resulting from this, including, 
limited resources.
With the backend there is a better option available that has near infinite resources (or at least you may assume this). 
Please note, however, that the backend will terminate any plugin subprocess after one second of run time in order to 
achieve a fast-responding service with good availability, but also to ensure that processes don't get stuck.
You can work around this limitation by starting long-running processes detached and offer an endpoint that can collect 
results from the detached process asynchronously.

### Plugin installation
Put the collection of files forming your plugin into a folder named with some yet unused 4-digit hex number and move 
the folder to the directory `plugins` at the root of the repository (or wherever `SALUS_PLUGIN_DIR` points to, if you 
set it). The folder's name is from that point on the plugin's instance-local UUID.
It must not be `0000` as this value is reserved for the framework itself.
Requests to a "plugin" with ID `0000` are responded with a status code 400 and a corresponding message.  

On the next Ctrl-F5 reload, you should see your plugin appear in the list of available plugins when starting a plugin 
by clicking the "+" button in a matching panel.

Plugin files are served straight from disk on every request, so changes to them are visible immediately - no restart
of the framework required.

## An Example plugin
This section is not ready yet.
Expect something that uses like everything the framework has to offer.

## Frequently Asked Questions
Since our first framework evaluation, several questions turned up frequently.

### How can I debug my plugins effectively?
Plugin files are served straight from the plugin directory on every request, so changes to them show up on the next
reload - no rebuild or restart of the framework needed.

Your browser's dev tool's network tab will be a great help.
If a plugin's backend request does not show there, it gets eaten by the frontend.
There are two main reasons for this behaviour: 
1. The frontend is not satisfied by the `origin` value of your `PluginFrontendRequest` object.
2. It is forced to send `GET` or `DELETE` requests with body, which won't work due to the `fetch` API's restrictions.

Additionally, it is always a good idea to add handling for JS objects of the following structure.
The framework provides you certain information when requests fail in the backend for some reason this way.
```json
{
  "message": "Computer says 'No'",
  "code": 418
}
```
#### `BackendErrorMessage`
| Key       | Type     | Explanation                                                              |
|-----------|----------|--------------------------------------------------------------------------|
| `message` | `string` | The framework's error message. Usually gives a hint to the error source. |
| `code`    | `int`    | The framework's response's HTTP status code.                             |

### What exactly is cached, how does caching work in this framework and why is it important?
Dioxus caches and hashes its asset file in the target directory, and for single-file assets updates them as soon as it
detects changes to the file.
However, this update mechanism does not happen for folder type assets which we use to load plugins into the frontend's
user interface.
This is a reported bug, which we now avoided entirely by moving the plugins out of the frontend.

### How is Error Handling designed in the Salus framework?
An earlier version of this document stated that error messages are silently discarded.

While this is still true for most errors occurring in the frontend, errors originating from the backend are handed to
the plugins as-is, with the small restrictions that their JSON is transformed to a JavaScrip object (see above).

We're working on improving error handling in the frontend, but, compared to resolving the plugin debugging issue, this
is currently not a priority to us.

### How does the response format of plugin backend requests look like?
See the section "Communication with the backend" further up in this document.
In general, the response format of successful responses (those with status code 200) is defined entirely by your
plugin's backend.
It reaches your plugins frontend in the `data` field of the `message` event that is issued when the response arrives
at the framework's frontend. 

In case your communication is formatted using valid JSON, the response arrives deserialised as JS object, in all other
cases as-is as `string`.

Error messages are always JSON-formatted and thus arrive as native JS objects, see above question on debugging and the 
included `BackendErrorMessage` type annotation for more information.

### How are arguments assembled in the backend?
See above `CommandArgument` section.
Generally, you can think of them being assembled with spaces in between arguments and/or values.
Also, expect that spaces you enter in any of your arguments are escaped before command assembly.

For reference, you can look up the exact behaviour here: [Rust Command documentation](https://doc.rust-lang.org/stable/std/process/struct.Command.html#method.arg).

### What's the working directory for my plugin's backend programs?
Your plugin backend's working directory is always the directory where your plugin's manifest file resides in.
Please keep all your intra-plugin links relative to and inside this directory (as long as your plugin is not of type
`extern`, in which case this is only relevant for potential backend handlers). 

### Does the Salus framework provide any measures to assign responses to their corresponding requests my plugin issues?
No, the Salus framework does not provide any mechanism that provides information to a plugin which response belongs to
which request.
This is intended behaviour.

By the framework's design, it is the **plugin's task** to introduce appropriate measures to assign identification 
properties to requests and responses.

### How do `body` type arguments work?
Quite simple: when providing a `body` type argument in an endpoint definition, you provide a value to it by sending 
a request body with your plugin's request to that endpoint. 
For details on how to achieve that, please refer to the section "Communication with the backend" of this document and
the associated `PluginFrontendRequest` type annotation table.

The request body is copied as-is into a temporary file when the backend evaluates the corresponding `CommandArgument`.
The temporary file's path is added as value to the command parameter you defined within said `CommandArgument`.
Your plugin's backend program can then read this file and process its contents.

The temporary file is deleted as soon as the backend endpoint handler finishes its execution.
If you have a long-running task, please ensure you moved the data from the file in time.

### How can I send binary data to and from the backend?
The `PluginFrontendRequest` body is defined as `string`, so binary data has to be base64-encoded before it can be sent
to the backend. If you're reading a file the user selected (e.g. via `<input type="file">`), 
[`FileReader.readAsDataURL()`](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL) is the
straightforward way to get there:
```js
const reader = new FileReader();
reader.onload = () => sendRequest("POST", "/upload", reader.result);
reader.readAsDataURL(fileInput.files[0]);
```

In the other direction, you can just create a file in the plugin directory and send its relative path to the client.
The client can then load it as a regular file resource, e.g. via `fetch`, the same way it loads its own static assets.

### How can I have background tasks that run for more than one second in the backend?
As the plugin backend handler by design only terminates the program that it called directly, all you need to do is 
to create a detached sub-process.

In the following you can interact with the detached process or poll its results with subsequent requests to another 
endpoint that executes a program that can read the detached process's outputs.

This contraption is also useful for database services and similar that should be available during an entire plugin
live time (or even always).

### Where can I find the code documentation?
You can find the code documentation (including this user guide) right here in the repository, 
in the root-level folder `doc`.
