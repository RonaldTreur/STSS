# STSS

Write your Titanium Alloy stylesheets using SCSS-like (Sassy CSS) syntax.

Note: Unlike SCSS itself, STSS is not an extension of TSS. STSS is an extension of SCSS, which itself extends CSS. This rules out the possibility to use JSON-like syntax at this point in time.

##Warning

This is basically a proof of concept a.k.a. very early work in progress. All details described below are subject to change. 
This code is NOT yet tested and in this state useful for demonstration purposes only.


## SCSS

STSS does not attempt to reimplement the SASS feature set, but instead leverages the fast [libsass](https://github.com/hcatlin/libsass) library underneath. In order to keep things as simple as possible, a thin layer has been added on top of the SCCS-syntax to accommodate for some of TSS's peculiarities.

Conversion consists of the following 4 steps:

1. STSS -> SCSS
2. SCSS -> CSS
3. CSS -> AST (JSON)
4. AST -> TSS


## Dynamic

Using SCSS allows for some interesting ways to rewrite TSS rules. Instead of limiting your options, our aim is to support multiple options as long as they reduce your workload. 

Below is a small example, using TSS snippet that was taken directly from the [official documentation](http://docs.appcelerator.com/titanium/latest/#!/guide/Alloy_Styles_and_Themes):

```json
"Label[platform=ios formFactor=handheld]": {
    backgroundColor: "#f00",
    text: 'iPhone'
}
```

You will be able to rewrite this in any of following ways:



```css
Label[platform=ios][formFactor=handheld] {
    backgroundColor: #f00;
    text: 'iPhone'
}
```

Using media queries:

```css
Label {
	@media (platform: ios) and (formFactor: handheld) {
    	backgroundColor: #f00;
    	text: 'iPhone'
    }
}
```

Shorter media queries:

```css
Label {
	@media ios and (handheld) {
    	backgroundColor: #f00;
    	text: 'iPhone'
    }
}
```

Of course you can also apply media queries CSS-style:

```css
@media ios and (handheld) {
	Label {
    	backgroundColor: #f00;
    	text: 'iPhone'
    }
}
```

## Abbreviations

For the sake of conveniency, let's try to get some abbreviations in as well.

Things like:

- `left` instead of `Ti.UI.TEXT_ALIGNMENT_LEFT`
- `size` instead of `Ti.UI.SIZE`

But also:

- `ios` instead of `platform=ios`
- `handheld` instead of `formfactor=handheld`


## Conversion

Below is a roughly detailed outline of how conversion currently works:

### STSS 2 SCSS:

1. Convert all hyphenated terms to camelCase (e.g. background-color to backgroundColor)
2. Quote all unquoted Ti.* and Alloy.* statements

### SCSS 2 CSS:

1. Standard conversion using libsass


### CSS 2 AST:

1. Convert all hyphenated terms to JSON objects
2. Convert all @media queries into square bracketed queries that follow the selector
3. Translate all short form stuff (e.g. 'ios' and 'center') to full Ti.* and Alloy.* statements

### AST 2 TSS:

1. Unquote all Ti.* and Alloy.* statements

