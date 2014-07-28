# STSS

[![NPM version](https://badge.fury.io/js/stss.svg)](http://badge.fury.io/js/stss)
[![Build Status](https://travis-ci.org/RonaldTreur/STSS.svg?branch=master)](http://travis-ci.org/RonaldTreur/STSS)

Write your Titanium Alloy stylesheets using SCSS (Sassy CSS) syntax.

## Get Sassy

STSS allows you to harness the full power of SCSS to generate your TSS stylesheets. Nested properties, variables, mixins, imports, it's all there!

To get SCSS conversion up and running, this project utilizes the powerful [libsass](https://github.com/hcatlin/libsass) library. Libsass is a C-port of the original SASS, written in Ruby. The benefit is that it is a whole lot faster. The primary disadvantage however is that feature-wise it's not on par with the latest version of SASS.


## Syntax

SCSS is a superset of CSS. It's perfectly fine for you to embed CSS directly into a SCSS document. However, this is not the case for STSS, which has been built directly on top of SCSS. As such it is a superset of SCSS. It is not built on top of TSS and it would balk if you ever tried to mix TSS directly into STSS. 

This means that if you want to use the power STSS brings you, you will have to get used to writing CSS-like stylesheets, instead of JSON. However, if you come from the web-world, this might be considered a benefit!

In short: **Knowledge of (at least) CSS is required.**


## Installation

There are two ways to install STSS: *globally* and *locally*. If you need STSS for a single project, local will suit your needs just fine. If you prefer to use STSS for multiple projects and dislike having to install it every time, then feel free useto the global method.

### Local Installation

Go to the root folder of your project (that contains the 'app' subfolder) and execute:

`npm install stss`

During installation STSS will try to add a pre-compile hook to your project's `alloy.jmk` file. If it does not exist, the file will be created.

### Global Installation

From any location execute:

`npm install stss -g`

This will make sure `stss` can be invoked from the CLI from any location. But *-unlike the local installation-* the alloy.jmk file won't be updated with a pre-compile hook. In order to get your STSS files automatically converted you will need to perform an additional command in the root folder of each of your projects (where you want to use STSS).

Go to the root folder of your project (that contains the 'app' subfolder) and execute:

`stss --jmk`


## Usage

STSS can be used via the command line interface (CLI), or by interacting directly with its API. If the pre-compile hook was installed successfully you don't have to do anything at all. STSS will simply be invoked everytime you build your app.

### Command Line Interface

If not working on an Alloy project, most of you will simply want to add STSS to your development stack using the CLI. Below you can find information on how to use it this way.

To convert a STSS file into a TSS file:
`stss <input.stss> <output.tss>`

For example:
`stss stss/app.stss tss/app.tss`

#### Options

##### --include-path
Path to look for @import-ed files. Defaults to the *current working directory*.

##### --stdout
Print the resulting TSS to stdout.

##### --jmk
Install a pre-compile hook for STSS into the app's alloy.jmk file.

##### -s --shorthand <file>
JSON file containing custom shorthand (structured after `shorthand.json`)

##### -v --verbose 
Print the outout from the various conversion stages

##### -h --help
Print usage info.

### API

Aside from the command line, STSS can be invoked from within your node application as well.

Render a STSS file by supplying its path:

```javascript
var stss = require('stss');
stss.render({
	file: stss_filename,
	success: callback
	[, options..]
});
```

Or, render STSS data directly:

```javascript
var stss = require('stss');
stss.render({
	data: stss_content,
	success: callback
	[, options..]
});
```

There is also a `renderSync` method if synchronous execution is required:

```javascript
var stss = require('stss');
stss.renderSync({
	file: stss_filename,
	success: callback
	[, options..]
});
```

#### Options

##### file

`file` is a `String` that contains the path to an STSS file that is to be converted. Either this property or `data` needs to be provided.

##### data

`data` is a `String` containing raw STSS that is to be rendered. Either this property or `file` needs to be provided.

##### success

`success` is a `Function` that will be called upon successful rendering of the STSS to TSS.


##### error

`error` is a `Function` that will be called upon occurrence of an error when rendering the STSS to TSS. This option is optional, but it's the only way to know an error occurred.

## SCSS Extensions


Below is a description of the primary features that have been added to STSS.

### Quotes

Similar to CSS and SCSS, only actual String-values need to be quoted. In practice this means only `text`-property values should be quoted. However, quotes (both single and double) are permitted. For example, this is perfectly fine:

```css
Label {
	font: {
		fontSize: '12dp';
		fontWeight: 'bold';
	}
}
```

But it could also be written without quotes, like this:

```css
Label {
	font: {
		fontSize: 12dp;
		fontWeight: bold;
	}
}
```

### Hyphens

Though TSS uses camelCase for property names, the CSS-world is more used to seeing hyphens instead. For this reason STSS supports both notations. Wherever you normally encounter a mid-word capital letter, you can instead insert a hyphen. For example:

```css
.classname {
	width: Ti.UI.SIZE;
	textAlign: Ti.UI.TEXT_ALIGNMENT_LEFT;
	shadowColor: #111; 
	shadowOffset: {
		x: 1;
		y: 3;
	}
}
```

could also be written as:

```css
.classname {
	width: Ti.UI.SIZE;
	text-align: Ti.UI.TEXT_ALIGNMENT_LEFT;
	shadow-color: #111; 
	shadow-offset: {
		x: 1;
		y: 3;
	}
}
```



### Nested Properties

Though TSS does not allow selectors to be nested (like SCSS does), it does allow for SCSS-like namespaces. Usually SCSS compiles these to flat properties, but STSS keeps them intact. For example:

```css
Label {
	font: {
		fontSize: 12dp;
		fontWeight: bold;
	}
}
```

will compile to:

```json
"Label": {
	"font": {
		"fontSize": "12dp",
		"fontWeight": "bold"
	}
}
```

**Note**: Since TSS does not support the CSS concept of child or descendent selectors, take care not to nest actual selectors when writing STSS. Though one of the strengths of SCSS -and STSS won't complain- the resulting TSS will be invalid.

### Shorthand

Property names used in TSS are directly derived from their Titanium API counterparts. This makes perfect sense, but some of these counterparts are quite lengthy. Especially when you need to use constants. Furthermore, now that you'll be using CSS-style notation for your markup, it might be nice to use terms you are already familiar with from your CSS-writing days. For these reasons STSS comes with support for abbreviations, or *shorthand* notation.

In order to not break future TSS (Titanium) versions, shorthands are bound to certain property names of namespace names.


#### Namespaced Property Names

Looking at the nested property example from the previous section, you might wonder why the property names are prefixed with 'font'. After all, being inside a namespace named 'font' this seems a bit redundant. This is however due to to Titanium's [Font](http://docs.appcelerator.com/titanium/latest/#!/api/Font) API, which TSS simply mirrors.

Using STSS you can however shorten this to be more in line with SCSS.

##### font

Inside a `font` namespace, the following shorthand values can be used:

- **family**: `fontFamily`
- **size**: `fontSize`
- **style**: `fontStyle`
- **width**: `fontWidth`

For example:

```css
Label {
	font: {
		size: 12dp,
		weight: bold
	}
}
```

#### Property Values

A few properties have been pre-selected to support shorthand property values out of the box. These properties are listed below, each containing a list of shorthand values and their original counterparts:


##### textAlign

- **left**: `Ti.UI.TEXT_ALIGNMENT_LEFT`
- **right**: `Ti.UI.TEXT_ALIGNMENT_RIGHT`
- **center**: `Ti.UI.TEXT_ALIGNMENT_CENTER`

For example:

```css
Label {
	textAlign: left;
}
```

##### width & height

- **size**: `Ti.UI.SIZE`
- **fill**: `Ti.UI.FILL`

For example:

```css
Button {
	width: size;
}
```

#### Queries

For your convenience a number of (often used) queries have been shortened as well. Below is a list:

##### platform

- **ios**: `platform=ios`
- **android**: `platform=android`
- **blackberry**: `platform=blackberry`
- **mobileweb**: `platform=mobileweb`

##### formFactor

- **handheld**: `formfactor=handheld`
- **tablet**: `formfactor=tablet`

For example:

```css
Label[ios handheld] {
	backgroundColor: #f00;
	text: 'iPhone';
}
```

### Queries

TSS queries are probably the area in which TSS differs most significantly from CSS. Using STSS however you have the option to use @media-queries as well. Below are the various supported options.

#### Regular TSS-style

```css
Label[platform=ios formFactor=handheld] {
	backgroundColor: #f00;
	text: 'iPhone';
}
```

#### Altered TSS-style

Instead of separated using spaces, every query is inside its own pair of brackets:

```css
Label[platform=ios][formFactor=handheld] {
	backgroundColor: #f00;
	text: 'iPhone';
}
```

#### Regular CSS-style

```css
@media (platform: ios) and (formFactor: handheld) {
	Label {
		backgroundColor: #f00;
		text: 'iPhone';
	}
}
```

Or using shorthand:

```css
@media ios and (handheld) {
	Label {
		backgroundColor: #f00;
		text: 'iPhone';
	}
}
```

#### Nested SCSS-style

```css
Label {
	@media (platform: ios) and (formFactor: handheld) {
		backgroundColor: #f00;
		text: 'iPhone';
	}
}
```

## @import

One of the nice features SCSS offers is the ability to import other SCSS files into the current one. As of version 0.2 STSS supports this feature as well for STSS files. 

The syntax is identical to SCSS:
`@import "file.stss";`

Multiple files can be imported on one line like this:
`@import "import1.stss", "import2.stss";`

Of course your STSS files can contain multiple import-statements, dispersed throughout the document.

**Note:** Only files with an `.stss`-extension, or no extension at all will be imported. 

Because the original `@import`-handling of SCSS has been left intact, files with a `.scss` extension will also be imported. **But** these can only contain valid S<b>C</b>SS data. To prevent stupid mistakes please always use STSS files and be sure to use the `.stss` extension for your stss files and `@import`-statements!


## How does all this work internally

For those interested, below is a basic outline of how conversion currently works.

### STSS 2 SCSS:

1. Convert all hyphenated terms to camelCase (e.g. background-color to backgroundColor)
2. Quote all unquoted Ti.\* and Alloy.\* strings
3. Convert regular TSS queries to split TSS queries

### SCSS 2 CSS:

1. Standard conversion using libsass


### CSS 2 JSON:

1. Convert all hyphenated terms to JSON objects
2. Convert all @media queries into square bracketed queries that are then glued to the selector
3. Expand all shorthand forms (e.g. 'ios' and 'center')

### JSON 2 TSS:

1. Unquote all Ti.\* and Alloy.\* statements
