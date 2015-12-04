# eMusic Download Monitor

This allows users of the eMusic music service to download music on Unix. The eMusic Download Manager (offered by eMusic) only runs on Windows and Mac. This Node.js application allows you to download files on Linux.

This is published in the Node Package Manager (NPM) as `emusic-dlm`.

## Usage

This node package installs a command line utility called `emusic-dlm`. 

When run, it monitors a specific _watch directory_ for the presence of new `.emx` files. These files contain track information as well as links to the actual downloadable songs. This tool examines those files, and downloads tracks to a specified _destination directory_. This destination directory (and destination file name) is computed based on several command line arguments. These arguments specify a _root directory_, a specification for optional subdirectories (based on the track's album or artist name) and a specification for the file name (based on the track name, number, artist or album).

Once started, it informs the user of its activity. It remains waiting for new files until you end the problem (with Control-C).

## Enabling EMX Downloads

To indicate to eMusic that you would like to use this download manager, you need to enter this URL in the same browser which you will download songs from:

http://www.emusic.com/dlm/install/

You need to do this once for each browser session.

## Command Line Arguments

The following command line arguments exist for this command line utility:

* `--watch-dir D`: Monitor directory 'D' for .emx files that are added to it. __Required. No default value exists.__ 
* `--root-dir D`: Save downloaded music files into root directory 'D'. _If omitted, defaults to the current working directory._
* `--sub-dir-spec S`: Specifies how directories under the root directory are created, based on dynamic tags, such as Album name or Artist name. See 'Subdirectory Specification' for details. _If omitted, no subdirectories are created. All music files are saved into the root directory._
* `--file-spec S`: Specifies how music files under the subdirectories are created, based on dynamic tags, such as Track Name, Track Number, or other static text. See 'File Naming Specification' for details. _If omitted, defaults to `'%ARTIST% - %ALBUM% - %TRACKNUM%'`_

## Subdirectory and File Specifications

### Subdirectory Specification

The value of the `--sub-dir-spec` flag consists any of the following character sequences:

* __Dynamic Fields.__ These are characters sequences that begin and end with the `%` character. The characters between the percent characters must be one of:
  * `ARTIST` - The name of the track's artist.
  * `ALBUM` - The name of the track's album.
* __Percent Character.__ To include the percent character in the result, use `%%`.
* __Forward Slash.__ This is evaluated as the end of a directory name (and start of a new name).
* __Static Text.__ This is any character sequence other than `%NAME%`, `%%` or `/`. This character is used directly in the name of the directory.

#### Examples

If the track being downloaded is from the Interpol album called "Antics" and the root directory is `/home/glenn/Music`, then the following subdirectories are created (if they don't already exist):

`--sub-dir-spec '%ALBUM%'`

```
/home/glenn/Music/Antics
```

`--sub-dir-spec '%ARTIST%/%ALBUM%'`

```
/home/glenn/Music/Interpol
/home/glenn/Music/Interpol/Antics
```

If no value is specified for `--sub-dir-spec`, then tracks are deposited in this directory:

```
/home/glenn/Music
```

### File Specification

The value of the `--file-spec` flag consists of many of the same character sequences as `--sub-dir-spec`, specifically:

* __Dynamic Fields.__ These are characters sequences that begin and end with the `%` character. The characters between the percent characters must be one of:
  * `ARTIST` - The name of the track's artist.
  * `ALBUM` - The name of the track's album.
  * `TRACKNUM` - The number of the track.
  * `TRACKNAME` - The name of the track.
* __Percent Character.__ To include the percent character in the result, use `%%`.
* __Static Text.__ This is any character sequence other than `%NAME%` or `%%`. This character is used directly in the name of the file. __Note that `/` is not allowed in the specification of a file.__

At the end of the file is appropriate suffix (e.g., `.mp3`). It does not need to be specified.

#### Examples

Assuming that we download the first song from "Antics", we can have it saved a number of different ways:

`--file-spec '%TRACKNUM%. %TRACKNAME%'`

```
1. Next Exit.mp3
```

`--file-spec '%ARTIST% - %TRACKNAME%'`

```
Interpol - Next Exit.mp3
```

## Internals 

After an `.emx` file is found, it is parsed and if the contents are valid, then the file is moved to the user's home directory (in a subfolder called `.emusic-dlm`). This directory contains your EMX files, but renamed to `YYYYMMDDHHMMSS.emx` where `YYYY` is the current year, `MM` is the current month number, `DD` is the current day, `HH` is the current hour (24 hour format), `MM` is the current minute, and `SS` is the current second.

If you run into any problems, you can try to download the files manually by inspecting the file contents.

## Future

I hope to make this a Web-based utility, whereby after starting, you open a browser at a specific port, enter your settings and then see updates to the web page as new files are downloaded.

## Changes

Version `1.0`:  Initial version which provides basic features and console based output.
