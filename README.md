# Salus Framework
[![Build Status](https://github.com/Morridin/salus-framework/actions/workflows/build.yml/badge.svg)](https://github.com/Morridin/salus-framework/actions/workflows/build.yml)

This project is intended to provide an open-source framework for medical software to live in and be run from.
The framework is distributed with a web-based user-interface that can be used with any modern browser.

By design, the Salus framework's user interface does not provide any relevant functionality by itself other than 
the ability to start plug-ins similar to how one would open a browser tab.
For future versions, we plan to integrate user authentication into the framework's functionalities.

As usual for web-based applications, this framework is split into a front-end and a back-end. 
The front-end is intended to mainly perform rendering tasks and present the user interface while the back-end is 
intended for computationally heavier tasks such as calculations or chunking and caching of very large images.
For technical reasons, the back-end is not entirely separate from the front-end.
The server that hosts the front-end and delivers it to the user's browser is the same as the back-end server. 

This architectural approach with two separate application parts has the significant advantage that calling functions of 
the back-end can just be done by calling that function from within the code, while Dioxus, the framework powering Salus, 
handles the rest.
Normally such actions require rather complex syntax with explicit requests to the server and similarly intricate code in
the back-end side handler.

For the plug-ins, however, this procedure stays a little bit more complex than just calling a function.
The Salus framework provides an API to the plug-ins living within it for the purpose of back-end communication.
The API mainly relays on the `postMessage` API on the front-end and a specific JSON format to direct the program calls 
in the back-end.
Plug-ins don't need to know how the messages are processed and transported in the framework, but only how to call the API.

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
The core of this framework are plug-ins that introduce functionality into the program.
The Salus Image Viewer was intended to be the first and most prominent example for such a plug-in.
However, it was postponed until further notice to allow for a better integrated framework.

A plug-in generally consists of a collection of one or more files centered around a manifest file named `plugin.json`.
That manifest controls all properties of the plug-in, starting with its name, over the front-end entry point to
The plug-in manifest is always at the root level of a plug-in's file tree.
Depending on the plug-ins design and properties, there may be additional files present in the same directory as the 
manifest or its child directories.
In the following image, you can see the file structure of our sample plug-in that we will discuss in-depth in the
final section of this document.

For now, we will focus on the plug-in manifest and other technical details required to understand and 
develop your own plug-ins for the Salus framework.

### The Plugin Manifest
First, we'll discuss the heartpiece of each and every plug-in - its manifest file `plugin.json`, of which you can see 
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
| `name`         | `string`               | The display name of the plug-in. May be any valid UTF-8 string.                                                                                                                                                                                                                                 |
| `type`         | `string`               | The type of the plug-in. The meaning of each type is covered in the Plug-in Types section later in this document.<br/>Allowed values: `static`, `dynamic`, `extern`, `rust`, `component`                                                                                                        |
| `source`       | `string`               | The path to the file that serves as the plug-in's entry point when displayed in the framework's front-end, relative to the manifest.<br/>Alternatively, you can set this value to the URL of any website serving the same purpose.                                                              |
| `dependencies` | `list[string]`         | Currently not used.<br/>In the future, it will be possible to define other plug-ins that are launched as a consequence of launching this plug-in. Then, you put the UUIDs of these dependency plug-ins into this list.                                                                          |
| `panels`       | `list[string]`         | The panel(s) in which this plug-in may be started. The key `all` is translated into a list of the other existing keys. Duplicates, are allowed but won't have any effect. The same goes for anything outside the allowed values.<br/>Allowed values: `all`, `right`, `left`, `center`, `bottom` |
| `endpoints`    | `list[PluginEndpoint]` | The back-end endpoints this plug-in defines for itself. For details, see next section.                                                                                                                                                                                                          |

#### `PluginEndpoint`
These objects each define a plug-in endpoint that can be accessed through the framework's API.  

| Key       | Type              | Explanation/Allowed Values                                                                                                                                                                                                                                                                                                                         |
|-----------|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `url`     | `string`          | The URL path of the endpoint defined by this object. There is no requirement for the path to be unique, however, note that only the first endpoint with matching path and method will be considered by the back-end.                                                                                                                               |
| `method`  | `string`          | The HTTP request method for this endpoint.<br/>Allowed values: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`<br/>Please note that the framework (more specifically, the JS `fetch` API) enforces the recommendations of [RFC-9110](https://datatracker.ietf.org/doc/html/rfc9110#section-9.3.1), and disallows `GET` requests with request body. |
| `handler` | `CommandTemplate` | The program call to be executed when the plug-in calls this endpoint. For details, see next section.                                                                                                                                                                                                                                               |

#### `CommandTemplate`
This type is the wrapper for a program call that the framework's back-end will perform on behalf of a plug-in. 
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
This type provides the relevant information for the back-end to process the plug-in program's arguments correctly.
Depending on the value type, each filled argument will result in one or two list entries in the arguments list of the 
executed program. 
The first entry is always the value in `name`.
Depending on the value type, the second value is omitted or filled with either a temporary file path or the value 
provided to the back-end handler via the query string.

The dynamic arguments represented by this type are evaluated by iterating over the owning `CommandTemplate`'s `args` field.
Hence, you cannot reuse a `CommandArgument` to have a program take multiple arguments of the same name (with possibly
different values).
However, you can have multiple `CommandArgument` objects consuming the same value from the request's query string!

| Key            | Type     | Explanation/Allowed Values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|----------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `display_name` | `string` | The name of the argument in the plug-in's front-end. This value will be used as key in the query string when calling the associated endpoint. Duplicate keys in the query string will result in parsing errors in the back-end.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
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

As the argument has `string` type, its validation always succeeds and it is appended like so to the plug-in's program 
call: `Question "of Life, the Universe, and Everything"` (or rather as list slice consisting of `Question` and `of Life,
the Universe, and Everything`).
If the argument's validation had failed or the argument wasn't there at all, the framework would exit here and provide a 
status 400 response indicating the cause with a standardised, JSON-formatted message. 

### Plugin Types
Currently, there are five different plug-in types defined, of which three are supported: `static`, `dynamic`, `extern`.

- `static` type plug-ins may consist of static HTML pages without any JavaScript.
- `dynamic` type plug-ins may consist of HTML pages without any further restriction. Especially, they are allowed to 
  perform requests to the framework back-end using JavaScript.
- `extern` type plug-ins may consist of an external website. That website may run JavaScript and anything, however, it 
  must allow the execution from within an `iframe`.
- `rust` type plug-ins are thought to be Rust executables that are executed as sort of DLL's within the framework. 
  **Currently not supported.**
- `component` type plug-ins are thought to be web-components that are directly integrated into the frameworks user 
  interface. **Currently not supported.**

Trying to start plug-ins of unsupported or unknown type will result in an error that is shown on the user interface.

### Additional files
When your plug-in requires additional files, e.g. images which are included inside your HTML file or executables that 
are run when making calls to the back-end, you must provide them together with the plug-in manifest in the same folder.

Except for URLs to external websites, all paths provided anywhere within the plug-in **must be RELATIVE** to this exact 
folder where the plug-in's manifest resides in.
This affects all paths provided, regardless if in the plug-in manifest or in any other file within the plug-in folder.
Especially, you cannot rely on any folder name or path elements closer to root than your plug-in manifest.
E.g. the entry point file `index.html` residing at the plug-in folder's root would be referenced exactly as `index.html`.

In addition to being relative to the plug-in manifest, paths provided within a plug-in must not reach outside the 
plug-in folder. 
Reaching outside is forbidden, however, this restriction is not enforced yet.
The status regarding enforcement may change at any time, without notice and may result in _a silent failure_.
Hence, it is the plug-in's author's obligation to introduce measures against illegal file paths. 

For long-term stability, please provide your plug-in's back-end executables as standalone binaries that don't require 
external dependencies to run. E.g., if your plug-in needs python, provide a working python instance with your plug-in.

### Communication between plug-ins

Local `dynamic` plug-ins can exchange live messages directly through the browser's `BroadcastChannel` API. Communication
is limited to local plug-ins served from the same origin as Salus. Installed local plug-ins are currently treated as
trusted application components, and `sourcePluginId` is routing metadata rather than cryptographic proof of identity.

Open the shared channel and send a payload to another mounted plug-in using its UUID:

```javascript
const channel = new BroadcastChannel("salus:plugin-messages");

channel.postMessage({
    sourcePluginId: "sender-plugin-uuid",
    targetPluginId: "target-plugin-uuid",
    payload: {text: "Hello"},
});
```

Listen on the same channel and filter messages by the receiving plug-in's UUID:

```javascript
channel.addEventListener("message", event => {
    if (event.data?.targetPluginId !== "receiver-plugin-uuid") return;

    console.log(event.data.sourcePluginId);
    console.log(event.data.payload);
});
```

Messages are delivered only while the receiving plug-in is mounted. If multiple mounted instances listen for the target
UUID, every instance receives the message. Sending to an unavailable UUID has no effect.

### Communication with the back-end
Whenever a plug-in has to perform computationally heavy or difficult tasks, it should relay on the resources of the 
back-end server instead of running such calculations within the browser window.

You can have anything as back-end part of your plug-in that is self-contained and runs on an out-of-the-box Linux system.
If you have any special requirements, please ask your administrator to take care.

Usage of the back-end server goes as follows: 
- The front-end of the plug-in sends a `postMessage` request to the framework's front-end, which in turn, calls the 
  back-end.
- The back-end calls the program specified for the respective handler, pumps in the arguments provided and collects 
  _everything that is written into the standard output_.
- The collected output is returned to the framework and the framework relays it as is to the front-end of the plug-in.

In detail:

The framework uses the [`postMessage` API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) for communication with plug-ins in the front-end.

The plug-in can initialise a request by calling `window.parent.postMessage(<JSON>);` with `<JSON>` being a serialised 
`PluginFrontendRequest` object, see the respective, following section.

The framework then handles the request by unpacking the JSON, and assembling an HTTP request from its contents.

The back-end will try to execute the command defined within the endpoint with all the provided arguments, and 
in success case return a status 200 and the contents of STDOUT in the response body.

In all other cases a corresponding HTTP status indicating an error will be returned, together with a message hinting to 
the error source. 
In case the plug-in's back-end program returned with a non-zero status code, a status 500 is responded, together with 
the contents of the program's output to `stderr`.

All response bodies are relayed to the plug-in front-end by calling `postMessage` on the plug-in's `iframe`.
The result is a `message` event in the plug-in front-end that contains the response, usually as plain text, in its 
`data` attribute.
It can be collected with a corresponding event handler.
Due to an implementation flaw, valid JSON is deserialised between extraction from the HTTP response and 
arrival as `message` event at the plug-in.
As a result, all messages containing valid JSON arrive as objects instead of strings!
This is especially relevant to error messages, which are JSON formatted by the back-end, but also if your plug-in
communicates with JSON-based messages by default.

#### `PluginFrontendRequest`
| Key        | Type             | Explanation/Allowed Values                                                                                                                                                                                                                                                       |
|------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `origin`   | `string`         | The address of the request origin. Put the value of `location.href` here, except for the case of `extern` type plug-ins. In this case you need to find a way to provide the plug-in manifest's path instead.                                                                     |
| `method`   | `string`         | The HTTP request method for this request. For supported/allowed values, please refer to the `PluginEndpoint` object section.                                                                                                                                                     |
| `endpoint` | `string`         | The path of the endpoint as defined within the plug-in manifest.                                                                                                                                                                                                                 |
| `body`     | `string \| null` | The HTTP request body associated with this request. Currently, its type is defined as string, but in the long run, anything should be fine. If there is no body in this request, set this value to null. _Please note that some HTTP request methods discourage request bodies._ |

Example:
```json
{
  "origin": "http://localhost:8080/plugins-dxh1234567890abcdef0/0042/index.html",
  "method": "GET",
  "endpoint": "/test",
  "body": null
}
```

### General Design Information
When designing a plug-in, you do not need to worry about naming conflicts with other plug-ins.
The framework takes care of this for you and isolates plug-ins from each other.
This is also the main reason, why reaching out of a plug-ins directory is prohibited and 
may stop working without prior notice.

Never perform heavy calculations in the plug-in's front-end. 
They will run directly on the user's browser with all the disadvantages resulting from this, including, 
limited resources.
With the back-end there is a better option available that has near infinite resources (or at least you may assume this). 
Please note, however, that the back-end will terminate any plug-in subprocess after one second of run time in order to 
achieve a fast-responding service with good availability, but also to ensure that processes don't get stuck.
You can work around this limitation by starting long-running processes detached and offer an endpoint that can collect 
results from the detached process asynchronously.

### Plugin installation
Put the collection of files forming your plug-in into a folder named with some yet unused 4-digit hex number and move 
the folder to the directory `frontend/plugins`. The folder's name is from that point on the plug-in's instance-local 
UUID.
It must not be `0000` as this value is reserved for the framework itself.
Requests to a "plug-in" with ID `0000` are responded with a status code 400 and a corresponding message.  

On the next Ctrl-F5 reload, you should see your plug-in appear in the list of available plug-ins when starting a plug-in 
by clicking the "+" button in a matching panel.

Please note that changes to plug-in files directly used by the front-end may only show after a restart of the 
framework due to caching.

## An Example plug-in
This section is not ready yet.
Expect something that uses like everything the framework has to offer.

## Frequently Asked Questions
Since our first framework evaluation, several questions turned up frequently.

### How can I debug my plug-ins effectively?
Unfortunately, this is currently unnecessary complex.
The main reason for this is that Dioxus does not hot-reload assets on change if they are folders.
The only workaround is to mirror your changes directly to the live assets folder (usually under `target/dx/frontend/debug/web/public/assets/plugins-dxh...`)
of your currently running framework. 

We're working on improving this situation, expect a solution in version 0.2.

Apart from that, your browser's dev tool's network tab will be a great help.
If a plug-in's back-end request does not show there, it gets eaten by the front-end.
There are two main reasons for this behaviour: 
1. The front-end is not satisfied by the `origin` value of your `PluginFrontendRequest` object.
2. It is forced to send `GET` or `DELETE` requests with body, which won't work due to the `fetch` API's restrictions.

Additionally, it is always a good idea to add handling for JS objects of the following structure.
The framework provides you certain information when requests fail in the back-end for some reason this way.
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
However, this update mechanism does not happen for folder type assets which we use to load plug-ins into the front-end's
user interface.
There is no option to turn off this behaviour.

As Dioxus caches its files as long as the application runs, this behaviour imposes a severe road block to plug-in 
debugging. 
The only way to directly counter it is described in the previous question on debugging.
Alternatively, you must restart the framework after each change.

### How is Error Handling designed in the Salus framework?
An earlier version of this document stated that error messages are silently discarded.

While this is still true for most errors occurring in the front-end, errors originating from the back-end are handed to
the plug-ins as-is, with the small restrictions that their JSON is transformed to a JavaScrip object (see above).

We're working on improving error handling in the front-end, but, compared to resolving the plug-in debugging issue, this
is currently not a priority to us.

### How does the response format of plug-in back-end requests look like?
See the section "Communication with the back-end" further up in this document.
In general, the response format of successful responses (those with status code 200) is defined entirely by your
plug-in's back-end.
It reaches your plug-ins front-end in the `data` field of the `message` event that is issued when the response arrives
at the framework's front-end. 

In case your communication is formatted using valid JSON, the response arrives deserialised as JS object, in all other
cases as-is as `string`.

Error messages are always JSON-formatted and thus arrive as native JS objects, see above question on debugging and the 
included `BackendErrorMessage` type annotation for more information.

### How are arguments assembled in the back-end?
See above `CommandArgument` section.
Generally, you can think of them being assembled with spaces in between arguments and/or values.
Also, expect that spaces you enter in any of your arguments are escaped before command assembly.

For reference, you can look up the exact behaviour here: [Rust Command documentation](https://doc.rust-lang.org/stable/std/process/struct.Command.html#method.arg).

### What's the working directory for my plug-in's back-end programs?
Your plug-in back-end's working directory is always the directory where your plug-in's manifest file resides in.
Please keep all your intra-plug-in links relative to and inside this directory (as long as your plug-in is not of type
`extern`, in which case this is only relevant for potential back-end handlers). 

### Does the Salus framework provide any measures to assign responses to their corresponding requests my plug-in issues?
No, the Salus framework does not provide any mechanism that provides information to a plug-in which response belongs to
which request.
This is intended behaviour.

By the framework's design, it is the **plug-in's task** to introduce appropriate measures to assign identification 
properties to requests and responses.

### How do `body` type arguments work?
Quite simple: when providing a `body` type argument in an endpoint definition, you provide a value to it by sending 
a request body with your plug-in's request to that endpoint. 
For details on how to achieve that, please refer to the section "Communication with the back-end" of this document and
the associated `PluginFrontendRequest` type annotation table.

The request body is copied as-is into a temporary file when the back-end evaluates the corresponding `CommandArgument`.
The temporary file's path is added as value to the command parameter you defined within said `CommandArgument`.
Your plug-in's back-end program can then read this file and process its contents.

The temporary file is deleted as soon as the back-end endpoint handler finishes its execution.
If you have a long-running task, please ensure you moved the data from the file in time.

### How can I send binary data to and from the back-end?
The original plan was to allow sending file names which the back-end then can load as additional resources.
However, due to Dioxus' caching (see above), this is currently not working. 
Expect this to change with version 0.2.

For the time being, you can use base64 encoding to transform your binary data into a valid UTF-8 string, which you then 
can send the same ways as any other text-based data.

### How can I have background tasks that run for more than one second in the back-end?
As the plug-in back-end handler by design only terminates the program that it called directly, all you need to do is 
to create a detached sub-process.

In the following you can interact with the detached process or poll its results with subsequent requests to another 
endpoint that executes a program that can read the detached process's outputs.

This contraption is also useful for database services and similar that should be available during an entire plug-in
live time (or even always).

### Where can I find the code documentation?
You can find the code documentation (including this user guide) right here in the repository, 
in the root-level folder `doc`.
