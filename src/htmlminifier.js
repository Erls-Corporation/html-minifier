/*!
 * HTMLMinifier v0.42
 * http://kangax.github.com/html-minifier/
 *
 * Copyright (c) 2010 Juriy "kangax" Zaytsev
 * Licensed under the MIT license.
 *
 */
 
(function(global){
  
  var log;
  if (global.console && global.console.log) {
    log = function(message) {
      // "preserving" `this`
      global.console.log(message);
    };
  }
  else {
    log = function(){ };
  }
  
  function trimWhitespace(str) {
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  }
  if (String.prototype.trim) {
    trimWhitespace = function(str) {
      return str.trim();
    };
  }
  
  function switchToProduction(text) {
    return text
      // uncomment production only code
      .replace(/<!--\[if production\]>((?:.|\s)*?)<!\[endif\]-->/g, "$1")
      // remove development code
      .replace(/<!--\[if development\]><!-->((?:.|\s)*?)<!--<!\[endif\]-->/g, '');
  }
  
  function collapseWhitespace(str) {
    return str.replace(/\s+/g, ' ');
  }
  
  function isConditionalComment(text) {
    return (/\[if[^\]]+\]/).test(text);
  }
  
  function isEventAttribute(attrName) {
    return (/^on[a-z]+/).test(attrName);
  }
  
  function canRemoveAttributeQuotes(value) {
    // http://www.w3.org/TR/html4/intro/sgmltut.html#attributes
    // avoid \w, which could match unicode in some implementations
    return (/^[a-zA-Z0-9-._:]+$/).test(value);
  }
  
  function attributesInclude(attributes, attribute) {
    for (var i = attributes.length; i--; ) {
      if (attributes[i].name.toLowerCase() === attribute) {
        return true;
      }
    }
    return false;
  }
  
  function isAttributeRedundant(tag, attrName, attrValue, attrs) {
    attrValue = trimWhitespace(attrValue.toLowerCase());
    return (
        (tag === 'script' && 
        attrName === 'language' && 
        attrValue === 'javascript') ||
        
        (tag === 'form' && 
        attrName === 'method' && 
        attrValue === 'get') ||
        
        (tag === 'input' && 
        attrName === 'type' &&
        attrValue === 'text') ||
        
        (tag === 'script' &&
        attrName === 'charset' &&
        !attributesInclude(attrs, 'src')) ||
        
        (tag === 'a' &&
        attrName === 'name' &&
        attributesInclude(attrs, 'id')) ||
        
        (tag === 'area' &&
        attrName === 'shape' &&
        attrValue === 'rect')
    );
  }
  
  function isScriptTypeAttribute(tag, attrName, attrValue) {
    return (
      tag === 'script' && 
      attrName === 'type' && 
      trimWhitespace(attrValue.toLowerCase()) === 'text/javascript'
    );
  }
  
  function isBooleanAttribute(attrName) {
    return (/^(?:checked|disabled|selected|readonly)$/).test(attrName);
  }
  
  function isUriTypeAttribute(attrName, tag) {
    return (
      ((/^(?:a|area|link|base)$/).test(tag) && attrName === 'href') ||
      (tag === 'img' && (/^(?:src|longdesc|usemap)$/).test(attrName)) ||
      (tag === 'object' && (/^(?:classid|codebase|data|usemap)$/).test(attrName)) ||
      (tag === 'q' && attrName === 'cite') ||
      (tag === 'blockquote' && attrName === 'cite') ||
      ((tag === 'ins' || tag === 'del') && attrName === 'cite') ||
      (tag === 'form' && attrName === 'action') ||
      (tag === 'input' && (attrName === 'src' || attrName === 'usemap')) ||
      (tag === 'head' && attrName === 'profile') ||
      (tag === 'script' && (attrName === 'src' || attrName === 'for'))
    );
  }
  
  function isNumberTypeAttribute(attrName, tag) {
    return (
      ((/^(?:a|area|object|button)$/).test(tag) && attrName === 'tabindex') ||
      (tag === 'input' && (attrName === 'maxlength' || attrName === 'tabindex')) ||
      (tag === 'select' && (attrName === 'size' || attrName === 'tabindex')) ||
      (tag === 'textarea' && (/^(?:rows|cols|tabindex)$/).test(attrName)) ||
      (tag === 'colgroup' && attrName === 'span') ||
      (tag === 'col' && attrName === 'span') ||
      ((tag === 'th' || tag == 'td') && (attrName === 'rowspan' || attrName === 'colspan'))  
    );
  }
  
  function cleanAttributeValue(tag, attrName, attrValue) {
    if (isEventAttribute(attrName)) {
      return trimWhitespace(attrValue).replace(/^javascript:\s*/i, '').replace(/\s*;$/, '');
    }
    else if (attrName === 'class') {
      return collapseWhitespace(trimWhitespace(attrValue));
    }
    else if (isUriTypeAttribute(attrName, tag) || isNumberTypeAttribute(attrName, tag)) {
      return trimWhitespace(attrValue);
    }
    else if (attrName === 'style') {
      return trimWhitespace(attrValue).replace(/\s*;\s*$/, '');
    }
    return attrValue;
  }
  
  function cleanConditionalComment(comment) {
    return comment
      .replace(/^(\[[^\]]+\]>)\s*/, '$1')
      .replace(/\s*(<!\[endif\])$/, '$1');
  }
  
  function removeCDATASections(text) {
    return text
      // "/* <![CDATA[ */" or "// <![CDATA["
      .replace(/^(?:\s*\/\*\s*<!\[CDATA\[\s*\*\/|\s*\/\/\s*<!\[CDATA\[.*)/, '')
      // "/* ]]> */" or "// ]]>"
      .replace(/(?:\/\*\s*\]\]>\s*\*\/|\/\/\s*\]\]>)\s*$/, '');
  }
  
  var reStartDelimiter = {
    // account for js + html comments (e.g.: //<!--)
    'script': /^\s*(?:\/\/)?\s*<!--.*\n?/,
    'style': /^\s*<!--\s*/
  };
  var reEndDelimiter = {
    'script': /\s*(?:\/\/)?\s*-->\s*$/,
    'style': /\s*-->\s*$/
  };
  function removeComments(text, tag) {
    return text.replace(reStartDelimiter[tag], '').replace(reEndDelimiter[tag], '');
  }
  
  function isOptionalTag(tag) {
    return (/^(?:html|t?body|t?head|tfoot|tr|option)$/).test(tag);
  }
  
  var reEmptyAttribute = new RegExp(
    '^(?:class|id|style|title|lang|dir|on(?:focus|blur|change|click|dblclick|mouse(' +
      '?:down|up|over|move|out)|key(?:press|down|up)))$');
      
  function canDeleteEmptyAttribute(tag, attrName, attrValue) {
    var isValueEmpty = /^(["'])?\s*\1$/.test(attrValue);
    if (isValueEmpty) {
      return (
        (tag === 'input' && attrName === 'value') ||
        reEmptyAttribute.test(attrName));
    }
    return false;
  }
  
  function canRemoveElement(tag) {
    return tag !== 'textarea';
  }
  
  function canCollapseWhitespace(tag) {
    return !(/^(?:script|style|pre|textarea)$/.test(tag));
  }
  
  function canTrimWhitespace(tag) {
    return !(/^(?:pre|textarea)$/.test(tag));
  }
  
  function isLocalRessource(tag, name, value) {
    return ((tag === 'link' && name === 'href') || (tag === 'script' && name === 'src')) 
            && value.indexOf('http://') !== 0 && !/[?&]noconcat=true(&|$)/.test(value)?
              value :
              false;
  }
  
  /*
   * findPath will return the deepest common path to a set of ressources. 
   * For example, the path to:
   * - script/jquery.js
   * - script/jquery.plugin.js
   * - script/ui/jquery.ui.js
   * is "script/"
   */
  function findPath(ressources, deepestPath) {
    // Last iteration
    if(!ressources || !ressources.length) {
      return deepestPath || '';
    }
    // clone this array before manipulating it. 
    ressources = ressources.join('\uffff').split('\uffff');
    // path of the first ressource of the list
    var path = ressources.shift().match(/(.*?)[^\/]$/)[1],
        commonPath,
        i = -1, 
        len, 
        dplen,
        plen = path.length;
    // First iteration
    if(!deepestPath) { 
      commonPath = path; 
    }
    else {
      dplen = deepestPath.length;
      len = dplen < plen? dplen : plen;
      while (++i < len && deepestPath[i] == path[i]) {
        if(path[i] === '/') { commonPath = path.substr(0, i+1); }
      }
    }
    return commonPath? 
      findPath(ressources, commonPath): 
      '';
  }
  
  function normalizeAttribute(attr, attrs, tag, options) {
    
    var attrName = attr.name.toLowerCase(),
        attrValue = attr.escaped,
        attrFragment;
    
    if ((options.removeRedundantAttributes && 
      isAttributeRedundant(tag, attrName, attrValue, attrs)) 
      ||
      (options.removeScriptTypeAttributes && 
      isScriptTypeAttribute(tag, attrName, attrValue))) {
      return '';
    }
    
    attrValue = cleanAttributeValue(tag, attrName, attrValue);
    
    if (!options.removeAttributeQuotes || 
        !canRemoveAttributeQuotes(attrValue)) {
      attrValue = '"' + attrValue + '"';
    }
    
    if (options.removeEmptyAttributes &&
        canDeleteEmptyAttribute(tag, attrName, attrValue)) {
      return '';
    }

    if (options.collapseBooleanAttributes && 
        isBooleanAttribute(attrName)) {
      attrFragment = attrName;
    }
    else {
      attrFragment = attrName + '=' + attrValue;
    }
    
    return (' ' + attrFragment);
  }
  
  function minify(value, options) {
    
    options = options || { };
    
    if (options.productionMode) {
      value = switchToProduction(value);
    }
    
    value = trimWhitespace(value);
    
    var results = [ ],
        buffer = [ ],
        scripts = [ ],
        styles = [ ],
        scriptsPath,
        stylesPath,
        currentChars = '',
        currentTag = '',
        removeTag,
        lint = options.lint,
        t = new Date();
    
    HTMLParser(value, {
      start: function( tag, attrs, unary ) {
        tag = tag.toLowerCase();
        currentTag = tag;
        currentChars = '';
        
        var attrsBuffer = [ ],
            localRessource = false,
            name, value,
            i = -1, len = attrs.length;
        
        lint && lint.testElement(tag);
        
        while ( ++i < len) {
          name = attrs[i].name.toLowerCase();
          value = attrs[i].escaped;
          lint && lint.testAttribute(tag, name, value);
          if (options.collectLocalRessources && !localRessource) {
            localRessource = isLocalRessource(tag, name, value);
          }
          attrsBuffer.push(normalizeAttribute(attrs[i], attrs, tag, options));
        }
        if (options.collectLocalRessources && localRessource) {
          if (tag === 'script') {
            scripts.push(localRessource);
            removeTag = true;
          }
          else {
            styles.push(localRessource);
          }
        }
        else {
          buffer.push('<', tag, attrsBuffer.join(''), '>');
        }
      },
      end: function( tag ) {
        var isElementEmpty = currentChars === '' && tag === currentTag;
        if (removeTag) {
          removeTag = false;
          return;
        }
        // insert minified local ressources when closing head or body
        else if (options.collectLocalRessources) {
          if (tag === 'head' && styles.length) {
            stylesPath = findPath(styles);
            buffer.push('<link rel="stylesheet" type="text/css" href="'+stylesPath+'style.all.css"/>');
          }
          else if (tag === 'body' && scripts.length) {
            scriptsPath = findPath(scripts);
            buffer.push('<script type="text/javascript" src="'+scriptsPath+'script.all.js"></script>');
          }
        }
        if ((options.removeEmptyElements && isElementEmpty && canRemoveElement(tag))) {
          // remove last "element" from buffer, return
          buffer.splice(buffer.lastIndexOf('<'));
          return;
        }
        else if (options.removeOptionalTags && isOptionalTag(tag)) {
          // noop, leave start tag in buffer
          return;
        }
        else {
          // push end tag to buffer
          buffer.push('</', tag.toLowerCase(), '>');
          results.push.apply(results, buffer);
        }
        // flush buffer
        buffer.length = 0;
        currentChars = '';
      },
      chars: function( text ) {
        if (currentTag === 'script' || currentTag === 'style') {
          if (options.removeCommentsFromCDATA) {
            text = removeComments(text, currentTag);
          }
          if (options.removeCDATASectionsFromCDATA) {
            text = removeCDATASections(text);
          }
        }
        if (options.collapseWhitespace) {
          if (canTrimWhitespace(currentTag)) {
            text = trimWhitespace(text);
          }
          if (canCollapseWhitespace(currentTag)) {
            text = collapseWhitespace(text);
          }
        }
        currentChars = text;
        lint && lint.testChars(text);
        buffer.push(text);
      },
      comment: function( text ) {
        if (options.removeComments) {
          if (isConditionalComment(text)) {
            text = '<!--' + cleanConditionalComment(text) + '-->';
          }
          else {
            text = '';
          }
        }
        else {
          text = '<!--' + text + '-->';
        }
        buffer.push(text);
      },
      doctype: function(doctype) {
        buffer.push(options.useShortDoctype ? '<!DOCTYPE html>' : collapseWhitespace(doctype));
      }
    });
    
    results.push.apply(results, buffer)    
    var str = results.join('');
    log('minified in: ' + (new Date() - t) + 'ms');
    return options.collectLocalRessources?
      {
        html: str,
        scripts: scripts,
        styles: styles,
        scriptsPath: scriptsPath,
        stylesPath: stylesPath
      }:
      str;
  }
  
  // export
  global.minify = minify;
  
})(this);