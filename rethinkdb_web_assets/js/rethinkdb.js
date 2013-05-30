CLOSURE_NO_DEPS=true;
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure).
 *
 * In uncompiled mode base.js will write out Closure's deps file, unless the
 * global <code>CLOSURE_NO_DEPS</code> is set to true.  This allows projects to
 * include their own deps file(s) from different locations.
 *
 */


/**
 * @define {boolean} Overridden to true by the compiler when --closure_pass
 *     or --mark_as_compiled is specified.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is
 * already defined in the current scope before assigning to prevent
 * clobbering if base.js is loaded more than once.
 *
 * @const
 */
function nn(){
var goog = goog || {}; // Identifies this file as the Closure base.
}


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
//goog.global = this;

/**
 * *fix* global and goog references so it'll work in both node and the browser
 */
var gbl = (typeof global === 'undefined') ? window : global;
if (!gbl.goog) {
    gbl.goog = {};
}
var goog = gbl.goog;
goog.global = gbl;

/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define goog.DEBUG=false to the JSCompiler. For example, most
 * toString() methods should be declared inside an "if (goog.DEBUG)" conditional
 * because they are generally used for debugging purposes and it is difficult
 * for the JSCompiler to statically determine whether they are used.
 */
goog.DEBUG = true;


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as JSCompiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he), see http://wiki/Main/IIISynonyms.
 */
goog.LOCALE = 'en';  // default to en


/**
 * Creates object stubs for a namespace.  The presence of one or more
 * goog.provide() calls indicate that the file defines the given
 * objects/namespaces.  Build tools also scan for provide/require statements
 * to discern dependencies, build dependency files (see deps.js), etc.
 * @see goog.require
 * @param {string} name Namespace provided by this file in the form
 *     "goog.package.part".
 */
goog.provide = function(name) {
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice. This is intended
    // to teach new developers that 'goog.provide' is effectively a variable
    // declaration. And when JSCompiler transforms goog.provide into a real
    // variable declaration, the compiled JS should work the same as the raw
    // JS--even when the raw JS uses goog.provide incorrectly.
    if (goog.isProvided_(name)) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    delete goog.implicitNamespaces_[name];

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      if (goog.getObjectByName(namespace)) {
        break;
      }
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name);
};


/**
 * Marks that the current file should only be used for testing, and never for
 * live code in production.
 * @param {string=} opt_message Optional message to add to the error that's
 *     raised when used in production code.
 */
goog.setTestOnly = function(opt_message) {
  if (COMPILED && !goog.DEBUG) {
    opt_message = opt_message || '';
    throw Error('Importing test-only code into non-debug environment' +
                opt_message ? ': ' + opt_message : '.');
  }
};


if (!COMPILED) {

  /**
   * Check if the given name has been goog.provided. This will return false for
   * names that are available only as implicit namespaces.
   * @param {string} name name of the object to look for.
   * @return {boolean} Whether the name has been provided.
   * @private
   */
  goog.isProvided_ = function(name) {
    return !goog.implicitNamespaces_[name] && !!goog.getObjectByName(name);
  };

  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares
   * that 'goog' and 'goog.events' must be namespaces.
   *
   * @type {Object}
   * @private
   */
  goog.implicitNamespaces_ = {};
}


/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {*=} opt_object the object to expose at the end of the path.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Certain browsers cannot parse code in the form for((a in b); c;);
  // This pattern is produced by the JSCompiler when it collapses the
  // statement above into the conditional loop below. To prevent this from
  // happening, use a for-loop and reserve the init logic as below.

  // Parentheses added to eliminate strict JS warning in Firefox.
  for (var part; parts.length && (part = parts.shift());) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object=} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {?} The value (object or primitive) or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var part; part = parts.shift(); ) {
    if (goog.isDefAndNotNull(cur[part])) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {Object} obj The namespace to globalize.
 * @param {Object=} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = goog.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};




// NOTE(nnaze): The debug DOM loader was included in base.js as an orignal
// way to do "debug-mode" development.  The dependency system can sometimes
// be confusing, as can the debug DOM loader's asyncronous nature.
//
// With the DOM loader, a call to goog.require() is not blocking -- the
// script will not load until some point after the current script.  If a
// namespace is needed at runtime, it needs to be defined in a previous
// script, or loaded via require() with its registered dependencies.
// User-defined namespaces may need their own deps file.  See http://go/js_deps,
// http://go/genjsdeps, or, externally, DepsWriter.
// http://code.google.com/closure/library/docs/depswriter.html
//
// Because of legacy clients, the DOM loader can't be easily removed from
// base.js.  Work is being done to make it disableable or replaceable for
// different environments (DOM-less JavaScript interpreters like Rhino or V8,
// for example). See bootstrap/ for more information.


/**
 * @define {boolean} Whether to enable the debug loader.
 *
 * If enabled, a call to goog.require() will attempt to load the namespace by
 * appending a script tag to the DOM (if the namespace has been registered).
 *
 * If disabled, goog.require() will simply assert that the namespace has been
 * provided (and depend on the fact that some outside tool correctly ordered
 * the script).
 */
goog.ENABLE_DEBUG_LOADER = true;


/**
 * Implements a system for the dynamic resolution of dependencies
 * that works in parallel with the BUILD system. Note that all calls
 * to goog.require will be stripped by the JSCompiler when the
 * --closure_pass option is used.
 * @see goog.provide
 * @param {string} name Namespace to include (as was given in goog.provide())
 *     in the form "goog.package.part".
 */
goog.require = function(name) {

  // if the object already exists we do not need do do anything
  // TODO(arv): If we start to support require based on file name this has
  //            to change
  // TODO(arv): If we allow goog.foo.* this has to change
  // TODO(arv): If we implement dynamic load after page load we should probably
  //            not remove this code for the compiled output
  if (!COMPILED) {
    if (goog.isProvided_(name)) {
      return;
    }

    if (goog.ENABLE_DEBUG_LOADER) {
      var path = goog.getPathFromDeps_(name);
      if (path) {
        goog.included_[path] = true;
        goog.writeScripts_();
        return;
      }
    }

    var errorMessage = 'goog.require could not find: ' + name;
    if (goog.global.console) {
      goog.global.console['error'](errorMessage);
    }


      throw Error(errorMessage);

  }
};


/**
 * Path for included scripts
 * @type {string}
 */
goog.basePath = '';


/**
 * A hook for overriding the base path.
 * @type {string|undefined}
 */
goog.global.CLOSURE_BASE_PATH;


/**
 * Whether to write out Closure's deps file. By default,
 * the deps are written.
 * @type {boolean|undefined}
 */
goog.global.CLOSURE_NO_DEPS;


/**
 * A function to import a single script. This is meant to be overridden when
 * Closure is being run in non-HTML contexts, such as web workers. It's defined
 * in the global scope so that it can be set before base.js is loaded, which
 * allows deps.js to be imported properly.
 *
 * The function is passed the script source, which is a relative URI. It should
 * return true if the script was imported, false otherwise.
 */
goog.global.CLOSURE_IMPORT_SCRIPT;


/**
 * Null function used for default values of callbacks, etc.
 * @return {void} Nothing.
 */
goog.nullFunction = function() {};


/**
 * The identity function. Returns its first argument.
 *
 * @param {*=} opt_returnValue The single value that will be returned.
 * @param {...*} var_args Optional trailing arguments. These are ignored.
 * @return {?} The first argument. We can't know the type -- just pass it along
 *      without type.
 * @deprecated Use goog.functions.identity instead.
 */
goog.identityFunction = function(opt_returnValue, var_args) {
  return opt_returnValue;
};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 *
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error
 * will be thrown when bar() is invoked.
 *
 * Note: This does not take the name of the function to override as
 * an argument because that would make it more difficult to obfuscate
 * our JavaScript code.
 *
 * @type {!Function}
 * @throws {Error} when invoked to indicate the method should be
 *   overridden.
 */
goog.abstractMethod = function() {
  throw Error('unimplemented abstract method');
};


/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 */
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    if (ctor.instance_) {
      return ctor.instance_;
    }
    if (goog.DEBUG) {
      // NOTE: JSCompiler can't optimize away Array#push.
      goog.instantiatedSingletons_[goog.instantiatedSingletons_.length] = ctor;
    }
    return ctor.instance_ = new ctor;
  };
};


/**
 * All singleton classes that have been instantiated, for testing. Don't read
 * it directly, use the {@code goog.testing.singleton} module. The compiler
 * removes this variable if unused.
 * @type {!Array.<!Function>}
 * @private
 */
goog.instantiatedSingletons_ = [];


if (!COMPILED && goog.ENABLE_DEBUG_LOADER) {
  /**
   * Object used to keep track of urls that have already been added. This
   * record allows the prevention of circular dependencies.
   * @type {Object}
   * @private
   */
  goog.included_ = {};


  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  goog.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    // used when resolving dependencies to prevent us from
    // visiting the file twice
    visited: {},
    written: {} // used to keep track of script files we have written
  };


  /**
   * Tries to detect whether is in the context of an HTML document.
   * @return {boolean} True if it looks like HTML document.
   * @private
   */
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != 'undefined' &&
           'write' in doc;  // XULDocument misses write.
  };


  /**
   * Tries to detect the base path of the base.js script that bootstraps Closure
   * @private
   */
  goog.findBasePath_ = function() {
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else if (!goog.inHtmlDocument_()) {
      return;
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName('script');
    // Search backwards since the current script is in almost all cases the one
    // that has base.js.
    for (var i = scripts.length - 1; i >= 0; --i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf('?');
      var l = qmark == -1 ? src.length : qmark;
      if (src.substr(l - 7, 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };


  /**
   * Imports a script if, and only if, that script hasn't already been imported.
   * (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT ||
        goog.writeScriptTag_;
    if (!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true;
    }
  };


  /**
   * The default implementation of the import function. Writes a script tag to
   * import the script.
   *
   * @param {string} src The script source.
   * @return {boolean} True if the script was imported, false otherwise.
   * @private
   */
  goog.writeScriptTag_ = function(src) {
    if (goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write(
          '<script type="text/javascript" src="' + src + '"></' + 'script>');
      return true;
    } else {
      return false;
    }
  };


  /**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls importScript_ in the correct order.
   * @private
   */
  goog.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          // If the required name is defined, we assume that it was already
          // bootstrapped by other means.
          if (!goog.isProvided_(requireName)) {
            if (requireName in deps.nameToPath) {
              visitNode(deps.nameToPath[requireName]);
            } else {
              throw Error('Undefined nameToPath for ' + requireName);
            }
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {?string} Url corresponding to the rule, or null.
   * @private
   */
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };

  goog.findBasePath_();

  // Allow projects to manage the deps files themselves.
  if (!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + 'deps.js');
  }
}



//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // Check these first, so we can avoid calling Object.prototype.toString if
      // possible.
      //
      // IE improperly marshals tyepof across execution contexts, but a
      // cross-context object will still return false for "instanceof Object".
      if (value instanceof Array) {
        return 'array';
      } else if (value instanceof Object) {
        return s;
      }

      // HACK: In order to use an Object prototype method on the arbitrary
      //   value, the compiler requires the value be cast to type Object,
      //   even though the ECMA spec explicitly allows it.
      var className = Object.prototype.toString.call(
          /** @type {Object} */ (value));
      // In Firefox 3.6, attempting to access iframe window objects' length
      // property throws an NS_ERROR_FAILURE, so we need to special-case it
      // here.
      if (className == '[object Window]') {
        return 'object';
      }

      // We cannot always use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if ((className == '[object Array]' ||
           // In IE all non value types are wrapped as objects across window
           // boundaries (not iframe though) so we have to do object detection
           // for this edge case
           typeof value.length == 'number' &&
           typeof value.splice != 'undefined' &&
           typeof value.propertyIsEnumerable != 'undefined' &&
           !value.propertyIsEnumerable('splice')

          )) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if ((className == '[object Function]' ||
          typeof value.call != 'undefined' &&
          typeof value.propertyIsEnumerable != 'undefined' &&
          !value.propertyIsEnumerable('call'))) {
        return 'function';
      }


    } else {
      return 'null';
    }

  } else if (s == 'function' && typeof value.call == 'undefined') {
    // In Safari typeof nodeList returns 'function', and on Firefox
    // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
    // and RegExps.  We would like to return object for those and we can
    // detect an invalid function by making sure that the function
    // object has a call method.
    return 'object';
  }
  return s;
};


/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.  Additionally, this function assumes that the global
 * undefined variable has not been redefined.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  return val !== undefined;
};


/**
 * Returns true if the specified value is |null|
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  // Note that undefined == null.
  return val != null;
};


/**
 * Returns true if the specified value is an array
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like
 * the value needs to be an object and have a getFullYear() function.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a string
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Returns true if the specified value is a function
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays
 * and functions.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = typeof val;
  return type == 'object' && val != null || type == 'function';
  // return Object(val) === val also works, but is slower, especially if val is
  // not an object.
};


/**
 * Gets a unique ID for an object. This mutates the object so that further
 * calls with the same object as a parameter returns the same value. The unique
 * ID is guaranteed to be unique across the current session amongst objects that
 * are passed into {@code getUid}. There is no guarantee that the ID is unique
 * or consistent across sessions. It is unsafe to generate unique ID for
 * function prototypes.
 *
 * @param {Object} obj The object to get the unique ID for.
 * @return {number} The unique ID for the object.
 */
goog.getUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // In Opera window.hasOwnProperty exists but always returns false so we avoid
  // using it. As a consequence the unique ID generated for BaseClass.prototype
  // and SubClass.prototype will be the same.
  return obj[goog.UID_PROPERTY_] ||
      (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_);
};


/**
 * Removes the unique ID from an object. This is useful if the object was
 * previously mutated using {@code goog.getUid} in which case the mutation is
 * undone.
 * @param {Object} obj The object to remove the unique ID field from.
 */
goog.removeUid = function(obj) {
  // TODO(arv): Make the type stricter, do not accept null.

  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[goog.UID_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * Name for unique ID property. Initialized in a way to help avoid collisions
 * with other closure javascript on the same page.
 * @type {string}
 * @private
 */
goog.UID_PROPERTY_ = 'closure_uid_' +
    Math.floor(Math.random() * 2147483648).toString(36);


/**
 * Counter for UID.
 * @type {number}
 * @private
 */
goog.uidCounter_ = 0;


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 * @deprecated Use goog.getUid instead.
 */
goog.getHashCode = goog.getUid;


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 * @deprecated Use goog.removeUid instead.
 */
goog.removeHashCode = goog.removeUid;


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.cloneObject</code> does not detect reference loops. Objects that
 * refer to themselves will cause infinite recursion.
 *
 * <code>goog.cloneObject</code> is unaware of unique identifiers, and copies
 * UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 * @deprecated goog.cloneObject is unsafe. Prefer the goog.object methods.
 */
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.cloneObject(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * A native implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 * @suppress {deprecated} The compiler thinks that Function.prototype.bind
 *     is deprecated because some people have declared a pure-JS version.
 *     Only the pure-JS version is truly deprecated.
 */
goog.bindNative_ = function(fn, selfObj, var_args) {
  return /** @type {!Function} */ (fn.call.apply(fn.bind, arguments));
};


/**
 * A pure-JS implementation of goog.bind.
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @private
 */
goog.bindJs_ = function(fn, selfObj, var_args) {
  if (!fn) {
    throw new Error();
  }

  if (arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      // Prepend the bound arguments to the current arguments.
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(selfObj, newArgs);
    };

  } else {
    return function() {
      return fn.apply(selfObj, arguments);
    };
  }
};


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of |this| 'pre-specified'.<br><br>
 *
 * Remaining arguments specified at call-time are appended to the pre-
 * specified ones.<br><br>
 *
 * Also see: {@link #partial}.<br><br>
 *
 * Usage:
 * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {Function} fn A function to partially apply.
 * @param {Object|undefined} selfObj Specifies the object which |this| should
 *     point to when the function is run.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to the function.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 * @suppress {deprecated} See above.
 */
goog.bind = function(fn, selfObj, var_args) {
  // TODO(nicksantos): narrow the type signature.
  if (Function.prototype.bind &&
      // NOTE(nicksantos): Somebody pulled base.js into the default
      // Chrome extension environment. This means that for Chrome extensions,
      // they get the implementation of Function.prototype.bind that
      // calls goog.bind instead of the native one. Even worse, we don't want
      // to introduce a circular dependency between goog.bind and
      // Function.prototype.bind, so we have to hack this to make sure it
      // works correctly.
      Function.prototype.bind.toString().indexOf('native code') != -1) {
    goog.bind = goog.bindNative_;
  } else {
    goog.bind = goog.bindJs_;
  }
  return goog.bind.apply(null, arguments);
};


/**
 * Like bind(), except that a 'this object' is not required. Useful when the
 * target function is already bound.
 *
 * Usage:
 * var g = partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {...*} var_args Additional arguments that are partially
 *     applied to fn.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    // Prepend the bound arguments to the current arguments.
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs);
  };
};


/**
 * Copies all the members of a source object to a target object. This method
 * does not work on all browsers for all objects that contain keys such as
 * toString or hasOwnProperty. Use goog.object.extend for this purpose.
 * @param {Object} target Target.
 * @param {Object} source Source.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE7 or lower, the for-in-loop does not contain any properties that are
  // not enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = Date.now || (function() {
  // Unary plus operator converts its operand to a number which in the case of
  // a date is done by calling getTime().
  return +new Date();
});


/**
 * Evals javascript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      goog.global.eval('var _et_ = 1;');
      if (typeof goog.global['_et_'] != 'undefined') {
        delete goog.global['_et_'];
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      var doc = goog.global.document;
      var scriptElt = doc.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(user): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.body.appendChild(scriptElt);
      doc.body.removeChild(scriptElt);
    }
  } else {
    throw Error('goog.globalEval not available');
  }
};


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {?boolean}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Optional map of CSS class names to obfuscated names used with
 * goog.getCssName().
 * @type {Object|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMapping_;


/**
 * Optional obfuscation style for CSS class names. Should be set to either
 * 'BY_WHOLE' or 'BY_PART' if defined.
 * @type {string|undefined}
 * @private
 * @see goog.setCssNameMapping
 */
goog.cssNameMappingStyle_;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * This function works in tandem with @see goog.setCssNameMapping.
 *
 * Without any mapping set, the arguments are simple joined with a
 * hyphen and passed through unaltered.
 *
 * When there is a mapping, there are two possible styles in which
 * these mappings are used. In the BY_PART style, each part (i.e. in
 * between hyphens) of the passed in css name is rewritten according
 * to the map. In the BY_WHOLE style, the full css name is looked up in
 * the map directly. If a rewrite is not specified by the map, the
 * compiler will output a warning.
 *
 * When the mapping is passed to the compiler, it will replace calls
 * to goog.getCssName with the strings from the mapping, e.g.
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x= 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If one argument is passed it will be processed, if two are passed
 * only the modifier will be processed, as it is assumed the first
 * argument was generated as a result of calling goog.getCssName.
 *
 * @param {string} className The class name.
 * @param {string=} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName;
  };

  var renameByParts = function(cssName) {
    // Remap all the parts individually.
    var parts = cssName.split('-');
    var mapped = [];
    for (var i = 0; i < parts.length; i++) {
      mapped.push(getMapping(parts[i]));
    }
    return mapped.join('-');
  };

  var rename;
  if (goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == 'BY_WHOLE' ?
        getMapping : renameByParts;
  } else {
    rename = function(a) {
      return a;
    };
  }

  if (opt_modifier) {
    return className + '-' + rename(opt_modifier);
  } else {
    return rename(className);
  }
};


/**
 * Sets the map to check when returning a value from goog.getCssName(). Example:
 * <pre>
 * goog.setCssNameMapping({
 *   "goog": "a",
 *   "disabled": "b",
 * });
 *
 * var x = goog.getCssName('goog');
 * // The following evaluates to: "a a-b".
 * goog.getCssName('goog') + ' ' + goog.getCssName(x, 'disabled')
 * </pre>
 * When declared as a map of string literals to string literals, the JSCompiler
 * will replace all calls to goog.getCssName() using the supplied map if the
 * --closure_pass flag is set.
 *
 * @param {!Object} mapping A map of strings to strings where keys are possible
 *     arguments to goog.getCssName() and values are the corresponding values
 *     that should be returned.
 * @param {string=} opt_style The style of css name mapping. There are two valid
 *     options: 'BY_PART', and 'BY_WHOLE'.
 * @see goog.getCssName for a description.
 */
goog.setCssNameMapping = function(mapping, opt_style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = opt_style;
};


/**
 * To use CSS renaming in compiled mode, one of the input files should have a
 * call to goog.setCssNameMapping() with an object literal that the JSCompiler
 * can extract and use to replace all calls to goog.getCssName(). In uncompiled
 * mode, JavaScript code should be loaded before this base.js file that declares
 * a global variable, CLOSURE_CSS_NAME_MAPPING, which is used below. This is
 * to ensure that the mapping is loaded before any calls to goog.getCssName()
 * are made in uncompiled mode.
 *
 * A hook for overriding the CSS name mapping.
 * @type {Object|undefined}
 */
goog.global.CLOSURE_CSS_NAME_MAPPING;


if (!COMPILED && goog.global.CLOSURE_CSS_NAME_MAPPING) {
  // This does not call goog.setCssNameMapping() because the JSCompiler
  // requires that goog.setCssNameMapping() be called with an object literal.
  goog.cssNameMapping_ = goog.global.CLOSURE_CSS_NAME_MAPPING;
}


/**
 * Abstract implementation of goog.getMsg for use with localized messages.
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object=} opt_values Map of place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    var value = ('' + values[key]).replace(/\$/g, '$$$$');
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), value);
  }
  return str;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * goog.exportProperty
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. goog.exportSymbol('public.path.Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction',
 *                       Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {*} object Object the name should point to.
 * @param {Object=} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {*} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   goog.base(this, a, b);
 * }
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  /** @override */
  childCtor.prototype.constructor = childCtor;
};


/**
 * Call up to the superclass.
 *
 * If this is called from a constructor, then this calls the superclass
 * contructor with arguments 1-N.
 *
 * If this is called from a prototype method, then you must pass
 * the name of the method as the second argument to this function. If
 * you do not, you will get a runtime error. This calls the superclass'
 * method with arguments 2-N.
 *
 * This function only works if you use goog.inherits to express
 * inheritance relationships between your classes.
 *
 * This function is a compiler primitive. At compile-time, the
 * compiler will do macro expansion to remove a lot of
 * the extra overhead that this function introduces. The compiler
 * will also enforce a lot of the assumptions that this function
 * makes, and treat it as a compiler error if you break them.
 *
 * @param {!Object} me Should always be "this".
 * @param {*=} opt_methodName The method name if calling a super method.
 * @param {...*} var_args The rest of the arguments.
 * @return {*} The return value of the superclass method.
 */
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if (caller.superClass_) {
    // This is a constructor. Call the superclass constructor.
    return caller.superClass_.constructor.apply(
        me, Array.prototype.slice.call(arguments, 1));
  }

  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for (var ctor = me.constructor;
       ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if (ctor.prototype[opt_methodName] === caller) {
      foundCaller = true;
    } else if (foundCaller) {
      return ctor.prototype[opt_methodName].apply(me, args);
    }
  }

  // If we did not find the caller in the prototype chain,
  // then one of two things happened:
  // 1) The caller is an instance method.
  // 2) This method was not called by the right caller.
  if (me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args);
  } else {
    throw Error(
        'goog.base called from a method of one name ' +
        'to a method of a different name');
  }
};


/**
 * Allow for aliasing within scope functions.  This function exists for
 * uncompiled code - in compiled code the calls will be inlined and the
 * aliases applied.  In uncompiled code the function is simply run since the
 * aliases as written are valid JavaScript.
 * @param {function()} fn Function to call.  This function can contain aliases
 *     to namespaces (e.g. "var dom = goog.dom") or classes
 *    (e.g. "var Timer = goog.Timer").
 */
goog.scope = function(fn) {
  fn.call(goog.global);
};


// Generated by CoffeeScript 1.6.2
var ar, aropt, print, rethinkdb, varar,
  __slice = [].slice;

rethinkdb = function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return rethinkdb.expr.apply(rethinkdb, args);
};

goog.provide("rethinkdb.base");

print = function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return console.log.apply(console, args);
};

ar = function(fun) {
  return function() {
    var args;

    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (args.length !== fun.length) {
      throw new RqlDriverError("Expected " + fun.length + " argument(s) but found " + args.length + ".");
    }
    return fun.apply(this, args);
  };
};

varar = function(min, max, fun) {
  return function() {
    var args;

    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (((min != null) && args.length < min) || ((max != null) && args.length > max)) {
      if ((min != null) && (max == null)) {
        throw new RqlDriverError("Expected " + min + " or more argument(s) but found " + args.length + ".");
      }
      if ((max != null) && (min == null)) {
        throw new RqlDriverError("Expected " + max + " or fewer argument(s) but found " + args.length + ".");
      }
      throw new RqlDriverError("Expected between " + min + " and " + max + " argument(s) but found " + args.length + ".");
    }
    return fun.apply(this, args);
  };
};

aropt = function(fun) {
  return function() {
    var args, expectedPosArgs, numPosArgs, perhapsOptDict;

    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    expectedPosArgs = fun.length - 1;
    perhapsOptDict = args[expectedPosArgs];
    if (perhapsOptDict && ((!(perhapsOptDict instanceof Object)) || (perhapsOptDict instanceof TermBase))) {
      perhapsOptDict = null;
    }
    numPosArgs = args.length - (perhapsOptDict != null ? 1 : 0);
    if (expectedPosArgs !== numPosArgs) {
      throw new RqlDriverError("Expected " + expectedPosArgs + " argument(s) but found " + numPosArgs + ".");
    }
    return fun.apply(this, args);
  };
};
// Generated by CoffeeScript 1.6.2
var RqlClientError, RqlCompileError, RqlDriverError, RqlQueryPrinter, RqlRuntimeError, RqlServerError, _ref, _ref1, _ref2,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

goog.provide("rethinkdb.errors");

goog.require("rethinkdb.base");

RqlDriverError = (function(_super) {
  __extends(RqlDriverError, _super);

  function RqlDriverError(msg) {
    this.name = this.constructor.name;
    this.msg = msg;
    this.message = msg;
  }

  return RqlDriverError;

})(Error);

RqlServerError = (function(_super) {
  __extends(RqlServerError, _super);

  function RqlServerError(msg, term, frames) {
    this.name = this.constructor.name;
    this.msg = msg;
    this.frames = frames.slice(0);
    this.message = "" + msg + " in:\n" + (RqlQueryPrinter.prototype.printQuery(term)) + "\n" + (RqlQueryPrinter.prototype.printCarrots(term, frames));
  }

  return RqlServerError;

})(Error);

RqlRuntimeError = (function(_super) {
  __extends(RqlRuntimeError, _super);

  function RqlRuntimeError() {
    _ref = RqlRuntimeError.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  return RqlRuntimeError;

})(RqlServerError);

RqlCompileError = (function(_super) {
  __extends(RqlCompileError, _super);

  function RqlCompileError() {
    _ref1 = RqlCompileError.__super__.constructor.apply(this, arguments);
    return _ref1;
  }

  return RqlCompileError;

})(RqlServerError);

RqlClientError = (function(_super) {
  __extends(RqlClientError, _super);

  function RqlClientError() {
    _ref2 = RqlClientError.__super__.constructor.apply(this, arguments);
    return _ref2;
  }

  return RqlClientError;

})(RqlServerError);

RqlQueryPrinter = (function() {
  var carrotify, composeCarrots, composeTerm, joinTree;

  function RqlQueryPrinter() {}

  RqlQueryPrinter.prototype.printQuery = function(term) {
    var tree;

    tree = composeTerm(term);
    return joinTree(tree);
  };

  composeTerm = function(term) {
    var arg, args, key, optargs, _ref3;

    args = (function() {
      var _i, _len, _ref3, _results;

      _ref3 = term.args;
      _results = [];
      for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
        arg = _ref3[_i];
        _results.push(composeTerm(arg));
      }
      return _results;
    })();
    optargs = {};
    _ref3 = term.optargs;
    for (key in _ref3) {
      if (!__hasProp.call(_ref3, key)) continue;
      arg = _ref3[key];
      optargs[key] = composeTerm(arg);
    }
    return term.compose(args, optargs);
  };

  RqlQueryPrinter.prototype.printCarrots = function(term, frames) {
    var tree;

    tree = composeCarrots(term, frames);
    return (joinTree(tree)).replace(/[^\^]/g, ' ');
  };

  composeCarrots = function(term, frames) {
    var arg, argNum, args, i, key, optargs, _i, _len, _ref3;

    argNum = frames.shift();
    if (argNum == null) {
      argNum = -1;
    }
    args = (function() {
      var _i, _len, _ref3, _results;

      _ref3 = term.args;
      _results = [];
      for (i = _i = 0, _len = _ref3.length; _i < _len; i = ++_i) {
        arg = _ref3[i];
        if (i === argNum) {
          _results.push(composeCarrots(arg, frames));
        } else {
          _results.push(composeTerm(arg));
        }
      }
      return _results;
    })();
    optargs = {};
    _ref3 = term.optargs;
    for (arg = _i = 0, _len = _ref3.length; _i < _len; arg = ++_i) {
      key = _ref3[arg];
      optargs[key] = key === argNum ? composeCarrots(arg, frames) : comoseTerm(arg);
    }
    if (argNum >= 0) {
      return term.compose(args, optargs);
    } else {
      return carrotify(term.compose(args, optargs));
    }
  };

  carrotify = function(tree) {
    return (joinTree(tree)).replace(/[^\^]/g, '^');
  };

  joinTree = function(tree) {
    var str, term, _i, _len;

    str = '';
    for (_i = 0, _len = tree.length; _i < _len; _i++) {
      term = tree[_i];
      if (goog.isArray(term)) {
        str += joinTree(term);
      } else {
        str += term;
      }
    }
    return str;
  };

  return RqlQueryPrinter;

})();
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Provides a base class for custom Error objects such that the
 * stack is correctly maintained.
 *
 * You should never need to throw goog.debug.Error(msg) directly, Error(msg) is
 * sufficient.
 *
 */

goog.provide('goog.debug.Error');



/**
 * Base class for custom error objects.
 * @param {*=} opt_msg The message associated with the error.
 * @constructor
 * @extends {Error}
 */
goog.debug.Error = function(opt_msg) {

  // Ensure there is a stack trace.
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, goog.debug.Error);
  } else {
    this.stack = new Error().stack || '';
  }

  if (opt_msg) {
    this.message = String(opt_msg);
  }
};
goog.inherits(goog.debug.Error, Error);


/** @override */
goog.debug.Error.prototype.name = 'CustomError';
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for string manipulation.
 */


/**
 * Namespace for string utilities
 */
goog.provide('goog.string');
goog.provide('goog.string.Unicode');


/**
 * Common Unicode string characters.
 * @enum {string}
 */
goog.string.Unicode = {
  NBSP: '\xa0'
};


/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix}.
 */
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0;
};


/**
 * Fast suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix}.
 */
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l;
};


/**
 * Case-insensitive prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix  A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(
      prefix, str.substr(0, prefix.length)) == 0;
};


/**
 * Case-insensitive suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(
      suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} str The string containing the pattern.
 * @param {...*} var_args The items to substitute into the pattern.
 * @return {string} A copy of {@code str} in which each occurrence of
 *     {@code %s} has been replaced an argument from {@code var_args}.
 */
goog.string.subs = function(str, var_args) {
  // This appears to be slow, but testing shows it compares more or less
  // equivalent to the regex.exec method.
  for (var i = 1; i < arguments.length; i++) {
    // We cast to String in case an argument is a Function.  Replacing $&, for
    // example, with $$$& stops the replace from subsituting the whole match
    // into the resultant string.  $$$& in the first replace becomes $$& in the
    //  second, which leaves $& in the resultant string.  Also:
    // $$, $`, $', $n $nn
    var replacement = String(arguments[i]).replace(/\$/g, '$$$$');
    str = str.replace(/\%s/, replacement);
  }
  return str;
};


/**
 * Converts multiple whitespace chars (spaces, non-breaking-spaces, new lines
 * and tabs) to a single space, and strips leading and trailing whitespace.
 * @param {string} str Input string.
 * @return {string} A copy of {@code str} with collapsed whitespace.
 */
goog.string.collapseWhitespace = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
};


/**
 * Checks if a string is empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} True if {@code str} is empty or whitespace only.
 */
goog.string.isEmpty = function(str) {
  // testing length == 0 first is actually slower in all browsers (about the
  // same in Opera).
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return /^[\s\xa0]*$/.test(str);
};


/**
 * Checks if a string is null, empty or contains only whitespaces.
 * @param {*} str The string to check.
 * @return {boolean} True if{@code str} is null, empty, or whitespace only.
 */
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str));
};


/**
 * Checks if a string is all breaking whitespace.
 * @param {string} str The string to check.
 * @return {boolean} Whether the string is all breaking whitespace.
 */
goog.string.isBreakingWhitespace = function(str) {
  return !/[^\t\n\r ]/.test(str);
};


/**
 * Checks if a string contains all letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} consists entirely of letters.
 */
goog.string.isAlpha = function(str) {
  return !/[^a-zA-Z]/.test(str);
};


/**
 * Checks if a string contains only numbers.
 * @param {*} str string to check. If not a string, it will be
 *     casted to one.
 * @return {boolean} True if {@code str} is numeric.
 */
goog.string.isNumeric = function(str) {
  return !/[^0-9]/.test(str);
};


/**
 * Checks if a string contains only numbers or letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} is alphanumeric.
 */
goog.string.isAlphaNumeric = function(str) {
  return !/[^a-zA-Z0-9]/.test(str);
};


/**
 * Checks if a character is a space character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a space.
 */
goog.string.isSpace = function(ch) {
  return ch == ' ';
};


/**
 * Checks if a character is a valid unicode character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a valid unicode character.
 */
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= ' ' && ch <= '~' ||
         ch >= '\u0080' && ch <= '\uFFFD';
};


/**
 * Takes a string and replaces newlines with a space. Multiple lines are
 * replaced with a single space.
 * @param {string} str The string from which to strip newlines.
 * @return {string} A copy of {@code str} stripped of newlines.
 */
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, ' ');
};


/**
 * Replaces Windows and Mac new lines with unix style: \r or \r\n with \n.
 * @param {string} str The string to in which to canonicalize newlines.
 * @return {string} {@code str} A copy of {@code} with canonicalized newlines.
 */
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, '\n');
};


/**
 * Normalizes whitespace in a string, replacing all whitespace chars with
 * a space.
 * @param {string} str The string in which to normalize whitespace.
 * @return {string} A copy of {@code str} with all whitespace normalized.
 */
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, ' ');
};


/**
 * Normalizes spaces in a string, replacing all consecutive spaces and tabs
 * with a single space. Replaces non-breaking space with a space.
 * @param {string} str The string in which to normalize spaces.
 * @return {string} A copy of {@code str} with all consecutive spaces and tabs
 *    replaced with a single space.
 */
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, ' ');
};


/**
 * Removes the breaking spaces from the left and right of the string and
 * collapses the sequences of breaking spaces in the middle into single spaces.
 * The original and the result strings render the same way in HTML.
 * @param {string} str A string in which to collapse spaces.
 * @return {string} Copy of the string with normalized breaking spaces.
 */
goog.string.collapseBreakingSpaces = function(str) {
  return str.replace(/[\t\r\n ]+/g, ' ').replace(
      /^[\t\r\n ]+|[\t\r\n ]+$/g, '');
};


/**
 * Trims white spaces to the left and right of a string.
 * @param {string} str The string to trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trim = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
};


/**
 * Trims whitespaces at the left end of a string.
 * @param {string} str The string to left trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimLeft = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+/, '');
};


/**
 * Trims whitespaces at the right end of a string.
 * @param {string} str The string to right trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimRight = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+$/, '');
};


/**
 * A string comparator that ignores case.
 * -1 = str1 less than str2
 *  0 = str1 equals str2
 *  1 = str1 greater than str2
 *
 * @param {string} str1 The string to compare.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} The comparator result, as described above.
 */
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();

  if (test1 < test2) {
    return -1;
  } else if (test1 == test2) {
    return 0;
  } else {
    return 1;
  }
};


/**
 * Regular expression used for splitting a string into substrings of fractional
 * numbers, integers, and non-numeric characters.
 * @type {RegExp}
 * @private
 */
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;


/**
 * String comparison function that handles numbers in a way humans might expect.
 * Using this function, the string "File 2.jpg" sorts before "File 10.jpg". The
 * comparison is mostly case-insensitive, though strings that are identical
 * except for case are sorted with the upper-case strings before lower-case.
 *
 * This comparison function is significantly slower (about 500x) than either
 * the default or the case-insensitive compare. It should not be used in
 * time-critical code, but should be fast enough to sort several hundred short
 * strings (like filenames) with a reasonable delay.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return -1;
  }
  if (!str2) {
    return 1;
  }

  // Using match to split the entire string ahead of time turns out to be faster
  // for most inputs than using RegExp.exec or iterating over each character.
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);

  var count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i];
    var b = tokens2[i];

    // Compare pairs of tokens, returning if one token sorts before the other.
    if (a != b) {

      // Only if both tokens are integers is a special comparison required.
      // Decimal numbers are sorted as strings (e.g., '.09' < '.1').
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }

  // If one string is a substring of the other, the shorter string sorts first.
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }

  // The two strings must be equivalent except for case (perfect equality is
  // tested at the head of the function.) Revert to default ASCII-betical string
  // comparison to stablize the sort.
  return str1 < str2 ? -1 : 1;
};


/**
 * URL-encodes a string
 * @param {*} str The string to url-encode.
 * @return {string} An encoded copy of {@code str} that is safe for urls.
 *     Note that '#', ':', and other characters used to delimit portions
 *     of URLs *will* be encoded.
 */
goog.string.urlEncode = function(str) {
  return encodeURIComponent(String(str));
};


/**
 * URL-decodes the string. We need to specially handle '+'s because
 * the javascript library doesn't convert them to spaces.
 * @param {string} str The string to url decode.
 * @return {string} The decoded {@code str}.
 */
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, ' '));
};


/**
 * Converts \n to <br>s or <br />s.
 * @param {string} str The string in which to convert newlines.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} A copy of {@code str} with converted newlines.
 */
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
};


/**
 * Escape double quote '"' characters in addition to '&', '<', and '>' so that a
 * string can be included in an HTML tag attribute value within double quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * NOTE(user):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean=} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {

  if (opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, '&amp;')
          .replace(goog.string.ltRe_, '&lt;')
          .replace(goog.string.gtRe_, '&gt;')
          .replace(goog.string.quotRe_, '&quot;');

  } else {
    // quick test helps in the case when there are no chars to replace, in
    // worst case this makes barely a difference to the time taken
    if (!goog.string.allRe_.test(str)) return str;

    // str.indexOf is faster than regex.test in this case
    if (str.indexOf('&') != -1) {
      str = str.replace(goog.string.amperRe_, '&amp;');
    }
    if (str.indexOf('<') != -1) {
      str = str.replace(goog.string.ltRe_, '&lt;');
    }
    if (str.indexOf('>') != -1) {
      str = str.replace(goog.string.gtRe_, '&gt;');
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, '&quot;');
    }
    return str;
  }
};


/**
 * Regular expression that matches an ampersand, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.amperRe_ = /&/g;


/**
 * Regular expression that matches a less than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.ltRe_ = /</g;


/**
 * Regular expression that matches a greater than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.gtRe_ = />/g;


/**
 * Regular expression that matches a double quote, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.quotRe_ = /\"/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @type {RegExp}
 * @private
 */
goog.string.allRe_ = /[&<>\"]/;


/**
 * Unescapes an HTML string.
 *
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, '&')) {
    // We are careful not to use a DOM if we do not have one. We use the []
    // notation so that the JSCompiler will not complain about these objects and
    // fields in the case where we have no DOM.
    if ('document' in goog.global) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      // Fall back on pure XML entities
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};


/**
 * Unescapes an HTML string using a DOM to resolve non-XML, non-numeric
 * entities. This function is XSS-safe and whitespace-preserving.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} The unescaped {@code str} string.
 */
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var seen = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"'};
  var div = document.createElement('div');
  // Match as many valid entity characters as possible. If the actual entity
  // happens to be shorter, it will still work as innerHTML will return the
  // trailing characters unchanged. Since the entity characters do not include
  // open angle bracket, there is no chance of XSS from the innerHTML use.
  // Since no whitespace is passed to innerHTML, whitespace is preserved.
  return str.replace(goog.string.HTML_ENTITY_PATTERN_, function(s, entity) {
    // Check for cached entity.
    var value = seen[s];
    if (value) {
      return value;
    }
    // Check for numeric entity.
    if (entity.charAt(0) == '#') {
      // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex numbers.
      var n = Number('0' + entity.substr(1));
      if (!isNaN(n)) {
        value = String.fromCharCode(n);
      }
    }
    // Fall back to innerHTML otherwise.
    if (!value) {
      // Append a non-entity character to avoid a bug in Webkit that parses
      // an invalid entity at the end of innerHTML text as the empty string.
      div.innerHTML = s + ' ';
      // Then remove the trailing character from the result.
      value = div.firstChild.nodeValue.slice(0, -1);
    }
    // Cache and return.
    return seen[s] = value;
  });
};


/**
 * Unescapes XML entities.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch (entity) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      default:
        if (entity.charAt(0) == '#') {
          // Prefix with 0 so that hex entities (e.g. &#x10) parse as hex.
          var n = Number('0' + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        // For invalid entities we just return the entity
        return s;
    }
  });
};


/**
 * Regular expression that matches an HTML entity.
 * See also HTML5: Tokenization / Tokenizing character references.
 * @private
 * @type {!RegExp}
 */
goog.string.HTML_ENTITY_PATTERN_ = /&([^;\s<&]+);?/g;


/**
 * Do escaping of whitespace to preserve spatial formatting. We use character
 * entity #160 to make it safer for xml.
 * @param {string} str The string in which to escape whitespace.
 * @param {boolean=} opt_xml Whether to use XML compatible tags.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, ' &#160;'), opt_xml);
};


/**
 * Strip quote characters around a string.  The second argument is a string of
 * characters to treat as quotes.  This can be a single character or a string of
 * multiple character and in that case each of those are treated as possible
 * quote characters. For example:
 *
 * <pre>
 * goog.string.stripQuotes('"abc"', '"`') --> 'abc'
 * goog.string.stripQuotes('`abc`', '"`') --> 'abc'
 * </pre>
 *
 * @param {string} str The string to strip.
 * @param {string} quoteChars The quote characters to strip.
 * @return {string} A copy of {@code str} without the quotes.
 */
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0; i < length; i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};


/**
 * Truncates a string to a certain length and adds '...' if necessary.  The
 * length also accounts for the ellipsis, so a maximum length of 10 and a string
 * 'Hello World!' produces 'Hello W...'.
 * @param {string} str The string to truncate.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cut off in the middle.
 * @return {string} The truncated {@code str} string.
 */
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    str = str.substring(0, chars - 3) + '...';
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Truncate a string in the middle, adding "..." if necessary,
 * and favoring the beginning of the string.
 * @param {string} str The string to truncate the middle of.
 * @param {number} chars Max number of characters.
 * @param {boolean=} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cutoff in the middle.
 * @param {number=} opt_trailingChars Optional number of trailing characters to
 *     leave at the end of the string, instead of truncating as close to the
 *     middle as possible.
 * @return {string} A truncated copy of {@code str}.
 */
goog.string.truncateMiddle = function(str, chars,
    opt_protectEscapedCharacters, opt_trailingChars) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (opt_trailingChars && str.length > chars) {
    if (opt_trailingChars > chars) {
      opt_trailingChars = chars;
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + '...' + str.substring(endPoint);
  } else if (str.length > chars) {
    // Favor the beginning of the string:
    var half = Math.floor(chars / 2);
    var endPos = str.length - half;
    half += chars % 2;
    str = str.substring(0, half) + '...' + str.substring(endPos);
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Special chars that need to be escaped for goog.string.quote.
 * @private
 * @type {Object}
 */
goog.string.specialEscapeChars_ = {
  '\0': '\\0',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\x0B': '\\x0B', // '\v' is not supported in JScript
  '"': '\\"',
  '\\': '\\\\'
};


/**
 * Character mappings used internally for goog.string.escapeChar.
 * @private
 * @type {Object}
 */
goog.string.jsEscapeCache_ = {
  '\'': '\\\''
};


/**
 * Encloses a string in double quotes and escapes characters so that the
 * string is a valid JS string.
 * @param {string} s The string to quote.
 * @return {string} A copy of {@code s} surrounded by double quotes.
 */
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] ||
          ((cc > 31 && cc < 127) ? ch : goog.string.escapeChar(ch));
    }
    sb.push('"');
    return sb.join('');
  }
};


/**
 * Takes a string and returns the escaped string for that character.
 * @param {string} str The string to escape.
 * @return {string} An escaped string representing {@code str}.
 */
goog.string.escapeString = function(str) {
  var sb = [];
  for (var i = 0; i < str.length; i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i));
  }
  return sb.join('');
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\x0E".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing {@code c}.
 */
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }

  if (c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c];
  }

  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    // tab is 9 but handled above
    if (cc < 256) {
      rv = '\\x';
      if (cc < 16 || cc > 256) {
        rv += '0';
      }
    } else {
      rv = '\\u';
      if (cc < 4096) { // \u1000
        rv += '0';
      }
    }
    rv += cc.toString(16).toUpperCase();
  }

  return goog.string.jsEscapeCache_[c] = rv;
};


/**
 * Takes a string and creates a map (Object) in which the keys are the
 * characters in the string. The value for the key is set to true. You can
 * then use goog.object.map or goog.array.map to change the values.
 * @param {string} s The string to build the map from.
 * @return {Object} The map of characters used.
 */
// TODO(arv): It seems like we should have a generic goog.array.toMap. But do
//            we want a dependency on goog.array in goog.string?
goog.string.toMap = function(s) {
  var rv = {};
  for (var i = 0; i < s.length; i++) {
    rv[s.charAt(i)] = true;
  }
  return rv;
};


/**
 * Checks whether a string contains a given substring.
 * @param {string} s The string to test.
 * @param {string} ss The substring to test for.
 * @return {boolean} True if {@code s} contains {@code ss}.
 */
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1;
};


/**
 * Returns the non-overlapping occurrences of ss in s.
 * If either s or ss evalutes to false, then returns zero.
 * @param {string} s The string to look in.
 * @param {string} ss The string to look for.
 * @return {number} Number of occurrences of ss in s.
 */
goog.string.countOf = function(s, ss) {
  return s && ss ? s.split(ss).length - 1 : 0;
};


/**
 * Removes a substring of a specified length at a specific
 * index in a string.
 * @param {string} s The base string from which to remove.
 * @param {number} index The index at which to remove the substring.
 * @param {number} stringLength The length of the substring to remove.
 * @return {string} A copy of {@code s} with the substring removed or the full
 *     string if nothing is removed or the input is invalid.
 */
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  // If the index is greater or equal to 0 then remove substring
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) +
        s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};


/**
 *  Removes the first occurrence of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), '');
  return s.replace(re, '');
};


/**
 *  Removes all occurrences of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, '');
};


/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 */
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
      replace(/\x08/g, '\\x08');
};


/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing {@code length} repetitions of
 *     {@code string}.
 */
goog.string.repeat = function(string, length) {
  return new Array(length + 1).join(string);
};


/**
 * Pads number to given length and optionally rounds it to a given precision.
 * For example:
 * <pre>padNumber(1.25, 2, 3) -> '01.250'
 * padNumber(1.25, 2) -> '01.25'
 * padNumber(1.25, 2, 1) -> '01.3'
 * padNumber(1.25, 0) -> '1.25'</pre>
 *
 * @param {number} num The number to pad.
 * @param {number} length The desired length.
 * @param {number=} opt_precision The desired precision.
 * @return {string} {@code num} as a string with the given options.
 */
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf('.');
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat('0', Math.max(0, length - index)) + s;
};


/**
 * Returns a string representation of the given object, with
 * null and undefined being returned as the empty string.
 *
 * @param {*} obj The object to convert.
 * @return {string} A string representation of the {@code obj}.
 */
goog.string.makeSafe = function(obj) {
  return obj == null ? '' : String(obj);
};


/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {...*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of {@code var_args}.
 */
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};


/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) +
         Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36);
};


/**
 * Compares two version numbers.
 *
 * @param {string|number} version1 Version of first item.
 * @param {string|number} version2 Version of second item.
 *
 * @return {number}  1 if {@code version1} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code version2} is higher.
 */
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  // Trim leading and trailing whitespace and split the versions into
  // subversions.
  var v1Subs = goog.string.trim(String(version1)).split('.');
  var v2Subs = goog.string.trim(String(version2)).split('.');
  var subCount = Math.max(v1Subs.length, v2Subs.length);

  // Iterate over the subversions, as long as they appear to be equivalent.
  for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
    var v1Sub = v1Subs[subIdx] || '';
    var v2Sub = v2Subs[subIdx] || '';

    // Split the subversions into pairs of numbers and qualifiers (like 'b').
    // Two different RegExp objects are needed because they are both using
    // the 'g' flag.
    var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
      var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
      // Break if there are no more matches.
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }

      // Parse the numeric part of the subversion. A missing number is
      // equivalent to 0.
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

      // Compare the subversion components. The number has the highest
      // precedence. Next, if the numbers are equal, a subversion without any
      // qualifier is always higher than a subversion with any qualifier. Next,
      // the qualifiers are compared as strings.
      order = goog.string.compareElements_(v1CompNum, v2CompNum) ||
          goog.string.compareElements_(v1Comp[2].length == 0,
              v2Comp[2].length == 0) ||
          goog.string.compareElements_(v1Comp[2], v2Comp[2]);
      // Stop as soon as an inequality is discovered.
    } while (order == 0);
  }

  return order;
};


/**
 * Compares elements of a version number.
 *
 * @param {string|number|boolean} left An element from a version number.
 * @param {string|number|boolean} right An element from a version number.
 *
 * @return {number}  1 if {@code left} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code right} is higher.
 * @private
 */
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  }
  return 0;
};


/**
 * Maximum value of #goog.string.hashCode, exclusive. 2^32.
 * @type {number}
 * @private
 */
goog.string.HASHCODE_MAX_ = 0x100000000;


/**
 * String hash function similar to java.lang.String.hashCode().
 * The hash code for a string is computed as
 * s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
 * where s[i] is the ith character of the string and n is the length of
 * the string. We mod the result to make it between 0 (inclusive) and 2^32
 * (exclusive).
 * @param {string} str A string.
 * @return {number} Hash value for {@code str}, between 0 (inclusive) and 2^32
 *  (exclusive). The empty string returns 0.
 */
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    result = 31 * result + str.charCodeAt(i);
    // Normalize to 4 byte range, 0 ... 2^32.
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};


/**
 * The most recent unique ID. |0 is equivalent to Math.floor in this case.
 * @type {number}
 * @private
 */
goog.string.uniqueStringCounter_ = Math.random() * 0x80000000 | 0;


/**
 * Generates and returns a string which is unique in the current document.
 * This is useful, for example, to create unique IDs for DOM elements.
 * @return {string} A unique id.
 */
goog.string.createUniqueString = function() {
  return 'goog_' + goog.string.uniqueStringCounter_++;
};


/**
 * Converts the supplied string to a number, which may be Ininity or NaN.
 * This function strips whitespace: (toNumber(' 123') === 123)
 * This function accepts scientific notation: (toNumber('1e1') === 10)
 *
 * This is better than Javascript's built-in conversions because, sadly:
 *     (Number(' ') === 0) and (parseFloat('123a') === 123)
 *
 * @param {string} str The string to convert.
 * @return {number} The number the supplied string represents, or NaN.
 */
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmpty(str)) {
    return NaN;
  }
  return num;
};


/**
 * Converts a string from selector-case to camelCase (e.g. from
 * "multi-part-string" to "multiPartString"), useful for converting
 * CSS selectors and HTML dataset keys to their equivalent JS properties.
 * @param {string} str The string in selector-case form.
 * @return {string} The string in camelCase form.
 */
goog.string.toCamelCase = function(str) {
  return String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase();
  });
};


/**
 * Converts a string from camelCase to selector-case (e.g. from
 * "multiPartString" to "multi-part-string"), useful for converting JS
 * style and dataset properties to equivalent CSS selectors and HTML keys.
 * @param {string} str The string in camelCase form.
 * @return {string} The string in selector-case form.
 */
goog.string.toSelectorCase = function(str) {
  return String(str).replace(/([A-Z])/g, '-$1').toLowerCase();
};


/**
 * Converts a string into TitleCase. First character of the string is always
 * capitalized in addition to the first letter of every subsequent word.
 * Words are delimited by one or more whitespaces by default. Custom delimiters
 * can optionally be specified to replace the default, which doesn't preserve
 * whitespace delimiters and instead must be explicitly included if needed.
 *
 * Default delimiter => " ":
 *    goog.string.toTitleCase('oneTwoThree')    => 'OneTwoThree'
 *    goog.string.toTitleCase('one two three')  => 'One Two Three'
 *    goog.string.toTitleCase('  one   two   ') => '  One   Two   '
 *    goog.string.toTitleCase('one_two_three')  => 'One_two_three'
 *    goog.string.toTitleCase('one-two-three')  => 'One-two-three'
 *
 * Custom delimiter => "_-.":
 *    goog.string.toTitleCase('oneTwoThree', '_-.')       => 'OneTwoThree'
 *    goog.string.toTitleCase('one two three', '_-.')     => 'One two three'
 *    goog.string.toTitleCase('  one   two   ', '_-.')    => '  one   two   '
 *    goog.string.toTitleCase('one_two_three', '_-.')     => 'One_Two_Three'
 *    goog.string.toTitleCase('one-two-three', '_-.')     => 'One-Two-Three'
 *    goog.string.toTitleCase('one...two...three', '_-.') => 'One...Two...Three'
 *    goog.string.toTitleCase('one. two. three', '_-.')   => 'One. two. three'
 *    goog.string.toTitleCase('one-two.three', '_-.')     => 'One-Two.Three'
 *
 * @param {string} str String value in camelCase form.
 * @param {string=} opt_delimiters Custom delimiter character set used to
 *      distinguish words in the string value. Each character represents a
 *      single delimiter. When provided, default whitespace delimiter is
 *      overridden and must be explicitly included if needed.
 * @return {string} String value in TitleCase form.
 */
goog.string.toTitleCase = function(str, opt_delimiters) {
  var delimiters = goog.isString(opt_delimiters) ?
      goog.string.regExpEscape(opt_delimiters) : '\\s';

  // For IE8, we need to prevent using an empty character set. Otherwise,
  // incorrect matching will occur.
  delimiters = delimiters ? '|[' + delimiters + ']+' : '';

  var regexp = new RegExp('(^' + delimiters + ')([a-z])', 'g');
  return str.replace(regexp, function(all, p1, p2) {
    return p1 + p2.toUpperCase();
  });
};


/**
 * Parse a string in decimal or hexidecimal ('0xFFFF') form.
 *
 * To parse a particular radix, please use parseInt(string, radix) directly. See
 * https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/parseInt
 *
 * This is a wrapper for the built-in parseInt function that will only parse
 * numbers as base 10 or base 16.  Some JS implementations assume strings
 * starting with "0" are intended to be octal. ES3 allowed but discouraged
 * this behavior. ES5 forbids it.  This function emulates the ES5 behavior.
 *
 * For more information, see Mozilla JS Reference: http://goo.gl/8RiFj
 *
 * @param {string|number|null|undefined} value The value to be parsed.
 * @return {number} The number, parsed. If the string failed to parse, this
 *     will be NaN.
 */
goog.string.parseInt = function(value) {
  // Force finite numbers to strings.
  if (isFinite(value)) {
    value = String(value);
  }

  if (goog.isString(value)) {
    // If the string starts with '0x' or '-0x', parse as hex.
    return /^\s*-?0x/i.test(value) ?
        parseInt(value, 16) : parseInt(value, 10);
  }

  return NaN;
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities to check the preconditions, postconditions and
 * invariants runtime.
 *
 * Methods in this package should be given special treatment by the compiler
 * for type-inference. For example, <code>goog.asserts.assert(foo)</code>
 * will restrict <code>foo</code> to a truthy value.
 *
 * The compiler has an option to disable asserts. So code like:
 * <code>
 * var x = goog.asserts.assert(foo()); goog.asserts.assert(bar());
 * </code>
 * will be transformed into:
 * <code>
 * var x = foo();
 * </code>
 * The compiler will leave in foo() (because its return value is used),
 * but it will remove bar() because it assumes it does not have side-effects.
 *
 */

goog.provide('goog.asserts');
goog.provide('goog.asserts.AssertionError');

goog.require('goog.debug.Error');
goog.require('goog.string');


/**
 * @define {boolean} Whether to strip out asserts or to leave them in.
 */
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;



/**
 * Error object for failed assertions.
 * @param {string} messagePattern The pattern that was used to form message.
 * @param {!Array.<*>} messageArgs The items to substitute into the pattern.
 * @constructor
 * @extends {goog.debug.Error}
 */
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  // Remove the messagePattern afterwards to avoid permenantly modifying the
  // passed in array.
  messageArgs.shift();

  /**
   * The message pattern used to format the error message. Error handlers can
   * use this to uniquely identify the assertion.
   * @type {string}
   */
  this.messagePattern = messagePattern;
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);


/** @override */
goog.asserts.AssertionError.prototype.name = 'AssertionError';


/**
 * Throws an exception with the given message and "Assertion failed" prefixed
 * onto it.
 * @param {string} defaultMessage The message to use if givenMessage is empty.
 * @param {Array.<*>} defaultArgs The substitution arguments for defaultMessage.
 * @param {string|undefined} givenMessage Message supplied by the caller.
 * @param {Array.<*>} givenArgs The substitution arguments for givenMessage.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 * @private
 */
goog.asserts.doAssertFailure_ =
    function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = 'Assertion failed';
  if (givenMessage) {
    message += ': ' + givenMessage;
    var args = givenArgs;
  } else if (defaultMessage) {
    message += ': ' + defaultMessage;
    args = defaultArgs;
  }
  // The '' + works around an Opera 10 bug in the unit tests. Without it,
  // a stack trace is added to var message above. With this, a stack trace is
  // not added until this line (it causes the extra garbage to be added after
  // the assertion message instead of in the middle of it).
  throw new goog.asserts.AssertionError('' + message, args || []);
};


/**
 * Checks if the condition evaluates to true if goog.asserts.ENABLE_ASSERTS is
 * true.
 * @param {*} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {*} The value of the condition.
 * @throws {goog.asserts.AssertionError} When the condition evaluates to false.
 */
goog.asserts.assert = function(condition, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_('', null, opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return condition;
};


/**
 * Fails if goog.asserts.ENABLE_ASSERTS is true. This function is useful in case
 * when we want to add a check in the unreachable area like switch-case
 * statement:
 *
 * <pre>
 *  switch(type) {
 *    case FOO: doSomething(); break;
 *    case BAR: doSomethingElse(); break;
 *    default: goog.assert.fail('Unrecognized type: ' + type);
 *      // We have only 2 types - "default:" section is unreachable code.
 *  }
 * </pre>
 *
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} Failure.
 */
goog.asserts.fail = function(opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError(
        'Failure' + (opt_message ? ': ' + opt_message : ''),
        Array.prototype.slice.call(arguments, 1));
  }
};


/**
 * Checks if the value is a number if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {number} The value, guaranteed to be a number when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a number.
 */
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_('Expected number but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {number} */ (value);
};


/**
 * Checks if the value is a string if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {string} The value, guaranteed to be a string when asserts enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a string.
 */
goog.asserts.assertString = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_('Expected string but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {string} */ (value);
};


/**
 * Checks if the value is a function if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Function} The value, guaranteed to be a function when asserts
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a function.
 */
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_('Expected function but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Function} */ (value);
};


/**
 * Checks if the value is an Object if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Object} The value, guaranteed to be a non-null object.
 * @throws {goog.asserts.AssertionError} When the value is not an object.
 */
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_('Expected object but got %s: %s.',
        [goog.typeOf(value), value],
        opt_message, Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Object} */ (value);
};


/**
 * Checks if the value is an Array if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {!Array} The value, guaranteed to be a non-null array.
 * @throws {goog.asserts.AssertionError} When the value is not an array.
 */
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_('Expected array but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {!Array} */ (value);
};


/**
 * Checks if the value is a boolean if goog.asserts.ENABLE_ASSERTS is true.
 * @param {*} value The value to check.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @return {boolean} The value, guaranteed to be a boolean when asserts are
 *     enabled.
 * @throws {goog.asserts.AssertionError} When the value is not a boolean.
 */
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_('Expected boolean but got %s: %s.',
        [goog.typeOf(value), value], opt_message,
        Array.prototype.slice.call(arguments, 2));
  }
  return /** @type {boolean} */ (value);
};


/**
 * Checks if the value is an instance of the user-defined type if
 * goog.asserts.ENABLE_ASSERTS is true.
 *
 * The compiler may tighten the type returned by this function.
 *
 * @param {*} value The value to check.
 * @param {!Function} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not an instance of
 *     type.
 * @return {!Object}
 */
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if (goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_('instanceof check failed.', null,
        opt_message, Array.prototype.slice.call(arguments, 3));
  }
  return /** @type {!Object} */(value);
};

// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utility methods for Protocol Buffer 2 implementation.
 */

goog.provide('goog.proto2.Util');

goog.require('goog.asserts');


/**
 * @define {boolean} Defines a PBCHECK constant that can be turned off by
 * clients of PB2. This for is clients that do not want assertion/checking
 * running even in non-COMPILED builds.
 */
goog.proto2.Util.PBCHECK = !COMPILED;


/**
 * Asserts that the given condition is true, if and only if the PBCHECK
 * flag is on.
 *
 * @param {*} condition The condition to check.
 * @param {string=} opt_message Error message in case of failure.
 * @throws {Error} Assertion failed, the condition evaluates to false.
 */
goog.proto2.Util.assert = function(condition, opt_message) {
  if (goog.proto2.Util.PBCHECK) {
    goog.asserts.assert(condition, opt_message);
  }
};


/**
 * Returns true if debug assertions (checks) are on.
 *
 * @return {boolean} The value of the PBCHECK constant.
 */
goog.proto2.Util.conductChecks = function() {
  return goog.proto2.Util.PBCHECK;
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Protocol Buffer Field Descriptor class.
 */

goog.provide('goog.proto2.FieldDescriptor');

goog.require('goog.proto2.Util');
goog.require('goog.string');



/**
 * A class which describes a field in a Protocol Buffer 2 Message.
 *
 * @param {Function} messageType Constructor for the message
 *     class to which the field described by this class belongs.
 * @param {number|string} tag The field's tag index.
 * @param {Object} metadata The metadata about this field that will be used
 *     to construct this descriptor.
 *
 * @constructor
 */
goog.proto2.FieldDescriptor = function(messageType, tag, metadata) {
  /**
   * The message type that contains the field that this
   * descriptor describes.
   * @type {Function}
   * @private
   */
  this.parent_ = messageType;

  // Ensure that the tag is numeric.
  goog.proto2.Util.assert(goog.string.isNumeric(tag));

  /**
   * The field's tag number.
   * @type {number}
   * @private
   */
  this.tag_ = /** @type {number} */ (tag);

  /**
   * The field's name.
   * @type {string}
   * @private
   */
  this.name_ = metadata.name;

  /** @type {goog.proto2.FieldDescriptor.FieldType} */
  metadata.fieldType;

  /** @type {*} */
  metadata.repeated;

  /** @type {*} */
  metadata.required;

  /**
   * If true, this field is a repeating field.
   * @type {boolean}
   * @private
   */
  this.isRepeated_ = !!metadata.repeated;

  /**
   * If true, this field is required.
   * @type {boolean}
   * @private
   */
  this.isRequired_ = !!metadata.required;

  /**
   * The field type of this field.
   * @type {goog.proto2.FieldDescriptor.FieldType}
   * @private
   */
  this.fieldType_ = metadata.fieldType;

  /**
   * If this field is a primitive: The native (ECMAScript) type of this field.
   * If an enumeration: The enumeration object.
   * If a message or group field: The Message function.
   * @type {Function}
   * @private
   */
  this.nativeType_ = metadata.type;

  /**
   * Is it permissible on deserialization to convert between numbers and
   * well-formed strings?  Is true for 64-bit integral field types, false for
   * all other field types.
   * @type {boolean}
   * @private
   */
  this.deserializationConversionPermitted_ = false;

  switch (this.fieldType_) {
    case goog.proto2.FieldDescriptor.FieldType.INT64:
    case goog.proto2.FieldDescriptor.FieldType.UINT64:
    case goog.proto2.FieldDescriptor.FieldType.FIXED64:
    case goog.proto2.FieldDescriptor.FieldType.SFIXED64:
    case goog.proto2.FieldDescriptor.FieldType.SINT64:
      this.deserializationConversionPermitted_ = true;
      break;
  }

  /**
   * The default value of this field, if different from the default, default
   * value.
   * @type {*}
   * @private
   */
  this.defaultValue_ = metadata.defaultValue;
};


/**
 * An enumeration defining the possible field types.
 * Should be a mirror of that defined in descriptor.h.
 *
 * @enum {number}
 */
goog.proto2.FieldDescriptor.FieldType = {
  DOUBLE: 1,
  FLOAT: 2,
  INT64: 3,
  UINT64: 4,
  INT32: 5,
  FIXED64: 6,
  FIXED32: 7,
  BOOL: 8,
  STRING: 9,
  GROUP: 10,
  MESSAGE: 11,
  BYTES: 12,
  UINT32: 13,
  ENUM: 14,
  SFIXED32: 15,
  SFIXED64: 16,
  SINT32: 17,
  SINT64: 18
};


/**
 * Returns the tag of the field that this descriptor represents.
 *
 * @return {number} The tag number.
 */
goog.proto2.FieldDescriptor.prototype.getTag = function() {
  return this.tag_;
};


/**
 * Returns the descriptor describing the message that defined this field.
 * @return {goog.proto2.Descriptor} The descriptor.
 */
goog.proto2.FieldDescriptor.prototype.getContainingType = function() {
  return this.parent_.descriptor_;
};


/**
 * Returns the name of the field that this descriptor represents.
 * @return {string} The name.
 */
goog.proto2.FieldDescriptor.prototype.getName = function() {
  return this.name_;
};


/**
 * Returns the default value of this field.
 * @return {*} The default value.
 */
goog.proto2.FieldDescriptor.prototype.getDefaultValue = function() {
  if (this.defaultValue_ === undefined) {
    // Set the default value based on a new instance of the native type.
    // This will be (0, false, "") for (number, boolean, string) and will
    // be a new instance of a group/message if the field is a message type.
    var nativeType = this.nativeType_;
    if (nativeType === Boolean) {
      this.defaultValue_ = false;
    } else if (nativeType === Number) {
      this.defaultValue_ = 0;
    } else if (nativeType === String) {
      this.defaultValue_ = '';
    } else {
      this.defaultValue_ = new nativeType;
    }
  }

  return this.defaultValue_;
};


/**
 * Returns the field type of the field described by this descriptor.
 * @return {goog.proto2.FieldDescriptor.FieldType} The field type.
 */
goog.proto2.FieldDescriptor.prototype.getFieldType = function() {
  return this.fieldType_;
};


/**
 * Returns the native (i.e. ECMAScript) type of the field described by this
 * descriptor.
 *
 * @return {Object} The native type.
 */
goog.proto2.FieldDescriptor.prototype.getNativeType = function() {
  return this.nativeType_;
};


/**
 * Returns true if simple conversions between numbers and strings are permitted
 * during deserialization for this field.
 *
 * @return {boolean} Whether conversion is permitted.
 */
goog.proto2.FieldDescriptor.prototype.deserializationConversionPermitted =
    function() {
  return this.deserializationConversionPermitted_;
};


/**
 * Returns the descriptor of the message type of this field. Only valid
 * for fields of type GROUP and MESSAGE.
 *
 * @return {goog.proto2.Descriptor} The message descriptor.
 */
goog.proto2.FieldDescriptor.prototype.getFieldMessageType = function() {
  goog.proto2.Util.assert(this.isCompositeType(), 'Expected message or group');

  return this.nativeType_.descriptor_;
};


/**
 * @return {boolean} True if the field stores composite data or repeated
 *     composite data (message or group).
 */
goog.proto2.FieldDescriptor.prototype.isCompositeType = function() {
  return this.fieldType_ == goog.proto2.FieldDescriptor.FieldType.MESSAGE ||
      this.fieldType_ == goog.proto2.FieldDescriptor.FieldType.GROUP;
};


/**
 * Returns whether the field described by this descriptor is repeating.
 * @return {boolean} Whether the field is repeated.
 */
goog.proto2.FieldDescriptor.prototype.isRepeated = function() {
  return this.isRepeated_;
};


/**
 * Returns whether the field described by this descriptor is required.
 * @return {boolean} Whether the field is required.
 */
goog.proto2.FieldDescriptor.prototype.isRequired = function() {
  return this.isRequired_;
};


/**
 * Returns whether the field described by this descriptor is optional.
 * @return {boolean} Whether the field is optional.
 */
goog.proto2.FieldDescriptor.prototype.isOptional = function() {
  return !this.isRepeated_ && !this.isRequired_;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating objects/maps/hashes.
 */

goog.provide('goog.object');


/**
 * Calls a function for each element in an object/map/hash.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and the return value is irrelevant.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 */
goog.object.forEach = function(obj, f, opt_obj) {
  for (var key in obj) {
    f.call(opt_obj, obj[key], key, obj);
  }
};


/**
 * Calls a function for each element in an object/map/hash. If that call returns
 * true, adds the element to a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This
 *     function takes 3 arguments (the element, the index and the object)
 *     and should return a boolean. If the return value is true the
 *     element is added to the result object. If it is false the
 *     element is not included.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {!Object} a new object in which only elements that passed the test
 *     are present.
 */
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key];
    }
  }
  return res;
};


/**
 * For every element in an object/map/hash calls a function and inserts the
 * result into a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and should return something. The result will be inserted
 *     into a new object.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {!Object} a new object with the results from f.
 */
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj);
  }
  return res;
};


/**
 * Calls a function for each element in an object/map/hash. If any
 * call returns true, returns true (without checking the rest). If
 * all calls return false, returns false.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} true if any element passes the test.
 */
goog.object.some = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls a function for each element in an object/map/hash. If
 * all calls return true, returns true. If any call returns false, returns
 * false at this point and does not continue to check the remaining elements.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object=} opt_obj This is used as the 'this' object within f.
 * @return {boolean} false if any element fails the test.
 */
goog.object.every = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (!f.call(opt_obj, obj[key], key, obj)) {
      return false;
    }
  }
  return true;
};


/**
 * Returns the number of key-value pairs in the object map.
 *
 * @param {Object} obj The object for which to get the number of key-value
 *     pairs.
 * @return {number} The number of key-value pairs in the object map.
 */
goog.object.getCount = function(obj) {
  // JS1.5 has __count__ but it has been deprecated so it raises a warning...
  // in other words do not use. Also __count__ only includes the fields on the
  // actual object and not in the prototype chain.
  var rv = 0;
  for (var key in obj) {
    rv++;
  }
  return rv;
};


/**
 * Returns one key from the object map, if any exists.
 * For map literals the returned key will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a key from.
 * @return {string|undefined} The key or undefined if the object is empty.
 */
goog.object.getAnyKey = function(obj) {
  for (var key in obj) {
    return key;
  }
};


/**
 * Returns one value from the object map, if any exists.
 * For map literals the returned value will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a value from.
 * @return {*} The value or undefined if the object is empty.
 */
goog.object.getAnyValue = function(obj) {
  for (var key in obj) {
    return obj[key];
  }
};


/**
 * Whether the object/hash/map contains the given object as a value.
 * An alias for goog.object.containsValue(obj, val).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The object for which to check.
 * @return {boolean} true if val is present.
 */
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val);
};


/**
 * Returns the values of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the values.
 * @return {!Array} The values in the object/map/hash.
 */
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = obj[key];
  }
  return res;
};


/**
 * Returns the keys of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the keys.
 * @return {!Array.<string>} Array of property keys.
 */
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = key;
  }
  return res;
};


/**
 * Get a value from an object multiple levels deep.  This is useful for
 * pulling values from deeply nested objects, such as JSON responses.
 * Example usage: getValueByKeys(jsonObj, 'foo', 'entries', 3)
 *
 * @param {!Object} obj An object to get the value from.  Can be array-like.
 * @param {...(string|number|!Array.<number|string>)} var_args A number of keys
 *     (as strings, or nubmers, for array-like objects).  Can also be
 *     specified as a single array of keys.
 * @return {*} The resulting value.  If, at any point, the value for a key
 *     is undefined, returns undefined.
 */
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;

  // Start with the 2nd parameter for the variable parameters syntax.
  for (var i = isArrayLike ? 0 : 1; i < keys.length; i++) {
    obj = obj[keys[i]];
    if (!goog.isDef(obj)) {
      break;
    }
  }

  return obj;
};


/**
 * Whether the object/map/hash contains the given key.
 *
 * @param {Object} obj The object in which to look for key.
 * @param {*} key The key for which to check.
 * @return {boolean} true If the map contains the key.
 */
goog.object.containsKey = function(obj, key) {
  return key in obj;
};


/**
 * Whether the object/map/hash contains the given value. This is O(n).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The value for which to check.
 * @return {boolean} true If the map contains the value.
 */
goog.object.containsValue = function(obj, val) {
  for (var key in obj) {
    if (obj[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its key.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object=} opt_this An optional "this" context for the function.
 * @return {string|undefined} The key of an element for which the function
 *     returns true or undefined if no such element is found.
 */
goog.object.findKey = function(obj, f, opt_this) {
  for (var key in obj) {
    if (f.call(opt_this, obj[key], key, obj)) {
      return key;
    }
  }
  return undefined;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its value.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object=} opt_this An optional "this" context for the function.
 * @return {*} The value of an element for which the function returns true or
 *     undefined if no such element is found.
 */
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key];
};


/**
 * Whether the object/map/hash is empty.
 *
 * @param {Object} obj The object to test.
 * @return {boolean} true if obj is empty.
 */
goog.object.isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};


/**
 * Removes all key value pairs from the object/map/hash.
 *
 * @param {Object} obj The object to clear.
 */
goog.object.clear = function(obj) {
  for (var i in obj) {
    delete obj[i];
  }
};


/**
 * Removes a key-value pair based on the key.
 *
 * @param {Object} obj The object from which to remove the key.
 * @param {*} key The key to remove.
 * @return {boolean} Whether an element was removed.
 */
goog.object.remove = function(obj, key) {
  var rv;
  if ((rv = key in obj)) {
    delete obj[key];
  }
  return rv;
};


/**
 * Adds a key-value pair to the object. Throws an exception if the key is
 * already in use. Use set if you want to change an existing pair.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} val The value to add.
 */
goog.object.add = function(obj, key, val) {
  if (key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val);
};


/**
 * Returns the value for the given key.
 *
 * @param {Object} obj The object from which to get the value.
 * @param {string} key The key for which to get the value.
 * @param {*=} opt_val The value to return if no item is found for the given
 *     key (default is undefined).
 * @return {*} The value for the given key.
 */
goog.object.get = function(obj, key, opt_val) {
  if (key in obj) {
    return obj[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the object/map/hash.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add.
 */
goog.object.set = function(obj, key, value) {
  obj[key] = value;
};


/**
 * Adds a key-value pair to the object/map/hash if it doesn't exist yet.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add if the key wasn't present.
 * @return {*} The value of the entry at the end of the function.
 */
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : (obj[key] = value);
};


/**
 * Does a flat clone of the object.
 *
 * @param {Object} obj Object to clone.
 * @return {!Object} Clone of the input object.
 */
goog.object.clone = function(obj) {
  // We cannot use the prototype trick because a lot of methods depend on where
  // the actual key is set.

  var res = {};
  for (var key in obj) {
    res[key] = obj[key];
  }
  return res;
  // We could also use goog.mixin but I wanted this to be independent from that.
};


/**
 * Clones a value. The input may be an Object, Array, or basic type. Objects and
 * arrays will be cloned recursively.
 *
 * WARNINGS:
 * <code>goog.object.unsafeClone</code> does not detect reference loops. Objects
 * that refer to themselves will cause infinite recursion.
 *
 * <code>goog.object.unsafeClone</code> is unaware of unique identifiers, and
 * copies UIDs created by <code>getUid</code> into cloned results.
 *
 * @param {*} obj The value to clone.
 * @return {*} A clone of the input value.
 */
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if (type == 'object' || type == 'array') {
    if (obj.clone) {
      return obj.clone();
    }
    var clone = type == 'array' ? [] : {};
    for (var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key]);
    }
    return clone;
  }

  return obj;
};


/**
 * Returns a new object in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * @param {Object} obj The object to transpose.
 * @return {!Object} The transposed object.
 */
goog.object.transpose = function(obj) {
  var transposed = {};
  for (var key in obj) {
    transposed[obj[key]] = key;
  }
  return transposed;
};


/**
 * The names of the fields that are defined on Object.prototype.
 * @type {Array.<string>}
 * @private
 */
goog.object.PROTOTYPE_FIELDS_ = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];


/**
 * Extends an object with another object.
 * This operates 'in-place'; it does not create a new Object.
 *
 * Example:
 * var o = {};
 * goog.object.extend(o, {a: 0, b: 1});
 * o; // {a: 0, b: 1}
 * goog.object.extend(o, {c: 2});
 * o; // {a: 0, b: 1, c: 2}
 *
 * @param {Object} target  The object to modify.
 * @param {...Object} var_args The objects from which values will be copied.
 */
goog.object.extend = function(target, var_args) {
  var key, source;
  for (var i = 1; i < arguments.length; i++) {
    source = arguments[i];
    for (key in source) {
      target[key] = source[key];
    }

    // For IE the for-in-loop does not contain any properties that are not
    // enumerable on the prototype object (for example isPrototypeOf from
    // Object.prototype) and it will also not include 'replace' on objects that
    // extend String and change 'replace' (not that it is common for anyone to
    // extend anything except Object).

    for (var j = 0; j < goog.object.PROTOTYPE_FIELDS_.length; j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
};


/**
 * Creates a new object built from the key-value pairs provided as arguments.
 * @param {...*} var_args If only one argument is provided and it is an array
 *     then this is used as the arguments,  otherwise even arguments are used as
 *     the property names and odd arguments are used as the property values.
 * @return {!Object} The new object.
 * @throws {Error} If there are uneven number of arguments or there is only one
 *     non array argument.
 */
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0]);
  }

  if (argLength % 2) {
    throw Error('Uneven number of arguments');
  }

  var rv = {};
  for (var i = 0; i < argLength; i += 2) {
    rv[arguments[i]] = arguments[i + 1];
  }
  return rv;
};


/**
 * Creates a new object where the property names come from the arguments but
 * the value is always set to true
 * @param {...*} var_args If only one argument is provided and it is an array
 *     then this is used as the arguments,  otherwise the arguments are used
 *     as the property names.
 * @return {!Object} The new object.
 */
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0]);
  }

  var rv = {};
  for (var i = 0; i < argLength; i++) {
    rv[arguments[i]] = true;
  }
  return rv;
};
// Copyright 2006 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Utilities for manipulating arrays.
 *
 */


goog.provide('goog.array');
goog.provide('goog.array.ArrayLike');

goog.require('goog.asserts');


/**
 * @define {boolean} NATIVE_ARRAY_PROTOTYPES indicates whether the code should
 * rely on Array.prototype functions, if available.
 *
 * The Array.prototype functions can be defined by external libraries like
 * Prototype and setting this flag to false forces closure to use its own
 * goog.array implementation.
 *
 * If your javascript can be loaded by a third party site and you are wary about
 * relying on the prototype functions, specify
 * "--define goog.NATIVE_ARRAY_PROTOTYPES=false" to the JSCompiler.
 */
goog.NATIVE_ARRAY_PROTOTYPES = true;


/**
 * @typedef {Array|NodeList|Arguments|{length: number}}
 */
goog.array.ArrayLike;


/**
 * Returns the last element in an array without removing it.
 * @param {goog.array.ArrayLike} array The array.
 * @return {*} Last item in array.
 */
goog.array.peek = function(array) {
  return array[array.length - 1];
};


/**
 * Reference to the original {@code Array.prototype}.
 * @private
 */
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;


// NOTE(arv): Since most of the array functions are generic it allows you to
// pass an array-like object. Strings have a length and are considered array-
// like. However, the 'in' operator does not work on strings so we cannot just
// use the array path even if the browser supports indexing into strings. We
// therefore end up splitting the string.


/**
 * Returns the index of the first element of an array with a specified
 * value, or -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-indexof}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at index 0.
 * @return {number} The index of the first matching array element.
 */
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
                     goog.array.ARRAY_PROTOTYPE_.indexOf ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ?
          0 : (opt_fromIndex < 0 ?
               Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex);

      if (goog.isString(arr)) {
        // Array.prototype.indexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.indexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i < arr.length; i++) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


/**
 * Returns the index of the last element of an array with a specified value, or
 * -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-lastindexof}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {?number=} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at the end of the array.
 * @return {number} The index of the last matching array element.
 */
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES &&
                         goog.array.ARRAY_PROTOTYPE_.lastIndexOf ?
    function(arr, obj, opt_fromIndex) {
      goog.asserts.assert(arr.length != null);

      // Firefox treats undefined and null as 0 in the fromIndex argument which
      // leads it to always return -1
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
      return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex);
    } :
    function(arr, obj, opt_fromIndex) {
      var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;

      if (fromIndex < 0) {
        fromIndex = Math.max(0, arr.length + fromIndex);
      }

      if (goog.isString(arr)) {
        // Array.prototype.lastIndexOf uses === so only strings should be found.
        if (!goog.isString(obj) || obj.length != 1) {
          return -1;
        }
        return arr.lastIndexOf(obj, fromIndex);
      }

      for (var i = fromIndex; i >= 0; i--) {
        if (i in arr && arr[i] === obj)
          return i;
      }
      return -1;
    };


/**
 * Calls a function for each element in an array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-foreach}
 *
 * @param {goog.array.ArrayLike} arr Array or array like object over
 *     which to iterate.
 * @param {?function(this: T, ...)} f The function to call for every element.
 *     This function takes 3 arguments (the element, the index and the array).
 *     The return value is ignored. The function is called only for indexes of
 *     the array which have assigned values; it is not called for indexes which
 *     have been deleted or which have never been assigned values.
 * @param {T=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @template T
 */
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES &&
                     goog.array.ARRAY_PROTOTYPE_.forEach ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          f.call(opt_obj, arr2[i], i, arr);
        }
      }
    };


/**
 * Calls a function for each element in an array, starting from the last
 * element rather than the first.
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 */
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; --i) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};


/**
 * Calls a function for each element in an array, and if the function returns
 * true adds the element to a new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-filter}
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean. If the return value is true the element is added to the
 *     result array. If it is false the element is not included.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array} a new array in which only elements that passed the test are
 *     present.
 */
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES &&
                    goog.array.ARRAY_PROTOTYPE_.filter ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = [];
      var resLength = 0;
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          var val = arr2[i];  // in case f mutates arr2
          if (f.call(opt_obj, val, i, arr)) {
            res[resLength++] = val;
          }
        }
      }
      return res;
    };


/**
 * Calls a function for each element in an array and inserts the result into a
 * new array.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-map}
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return something. The result will be inserted into a new array.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {!Array} a new array with the results from f.
 */
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES &&
                 goog.array.ARRAY_PROTOTYPE_.map ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var res = new Array(l);
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2) {
          res[i] = f.call(opt_obj, arr2[i], i, arr);
        }
      }
      return res;
    };


/**
 * Passes every element of an array into a function and accumulates the result.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduce}
 *
 * For example:
 * var a = [1, 2, 3, 4];
 * goog.array.reduce(a, function(r, v, i, arr) {return r + v;}, 0);
 * returns 10
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of the array.
 */
goog.array.reduce = function(arr, f, val, opt_obj) {
  if (arr.reduce) {
    if (opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduce(f, val);
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Passes every element of an array into a function and accumulates the result,
 * starting from the last element and working towards the first.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-reduceright}
 *
 * For example:
 * var a = ['a', 'b', 'c'];
 * goog.array.reduceRight(a, function(r, v, i, arr) {return r + v;}, '');
 * returns 'cba'
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {*} Object returned as a result of evaluating f repeatedly across the
 *     values of the array.
 */
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if (arr.reduceRight) {
    if (opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduceRight(f, val);
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Calls f for each element of an array. If any call returns true, some()
 * returns true (without checking the remaining elements). If all calls
 * return false, some() returns false.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-some}
 *
 * @param {goog.array.ArrayLike} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object=} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} true if any element passes the test.
 */
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES &&
                  goog.array.ARRAY_PROTOTYPE_.some ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
          return true;
        }
      }
      return false;
    };


/**
 * Call f for each element of an array. If all calls return true, every()
 * returns true. If any call returns false, every() returns false and
 * does not continue to check the remaining elements.
 *
 * See {@link http://tinyurl.com/developer-mozilla-org-array-every}
 *
 * @param {goog.array.ArrayLike} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} false if any element fails the test.
 */
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES &&
                   goog.array.ARRAY_PROTOTYPE_.every ?
    function(arr, f, opt_obj) {
      goog.asserts.assert(arr.length != null);

      return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj);
    } :
    function(arr, f, opt_obj) {
      var l = arr.length;  // must be fixed during loop... see docs
      var arr2 = goog.isString(arr) ? arr.split('') : arr;
      for (var i = 0; i < l; i++) {
        if (i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
          return false;
        }
      }
      return true;
    };


/**
 * Search an array for the first element that satisfies a given condition and
 * return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {*} The first array element that passes the test, or null if no
 *     element is found.
 */
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the first array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {*} The last array element that passes the test, or null if no
 *     element is found.
 */
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {number} The index of the last array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; i--) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Whether the array contains the given object.
 * @param {goog.array.ArrayLike} arr The array to test for the presence of the
 *     element.
 * @param {*} obj The object for which to test.
 * @return {boolean} true if obj is present.
 */
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0;
};


/**
 * Whether the array is empty.
 * @param {goog.array.ArrayLike} arr The array to test.
 * @return {boolean} true if empty.
 */
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};


/**
 * Clears the array.
 * @param {goog.array.ArrayLike} arr Array or array like object to clear.
 */
goog.array.clear = function(arr) {
  // For non real arrays we don't have the magic length so we delete the
  // indices.
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1; i >= 0; i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};


/**
 * Pushes an item into an array, if it's not already in the array.
 * @param {Array} arr Array into which to insert the item.
 * @param {*} obj Value to add.
 */
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};


/**
 * Inserts an object at the given index of the array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};


/**
 * Inserts at the given index of the array, all elements of another array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {goog.array.ArrayLike} elementsToAdd The array of elements to add.
 * @param {number=} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};


/**
 * Inserts an object into an array before a specified object.
 * @param {Array} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {*=} opt_obj2 The object before which obj should be inserted. If obj2
 *     is omitted or not found, obj is inserted at the end of the array.
 */
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};


/**
 * Removes the first occurrence of a particular value from an array.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {*} obj Object to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if ((rv = i >= 0)) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};


/**
 * Removes from an array the element at index i
 * @param {goog.array.ArrayLike} arr Array or array like object from which to
 *     remove value.
 * @param {number} i The index to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);

  // use generic form of splice
  // splice returns the removed items and if successful the length of that
  // will be 1
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1;
};


/**
 * Removes the first value that satisfies the given condition.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object=} opt_obj An optional "this" context for the function.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};


/**
 * Returns a new array that is the result of joining the arguments.  If arrays
 * are passed then their items are added, however, if non-arrays are passed they
 * will be added to the return array as is.
 *
 * Note that ArrayLike objects will be added as is, rather than having their
 * items added.
 *
 * goog.array.concat([1, 2], [3, 4]) -> [1, 2, 3, 4]
 * goog.array.concat(0, [1, 2]) -> [0, 1, 2]
 * goog.array.concat([1, 2], null) -> [1, 2, null]
 *
 * There is bug in all current versions of IE (6, 7 and 8) where arrays created
 * in an iframe become corrupted soon (not immediately) after the iframe is
 * destroyed. This is common if loading data via goog.net.IframeIo, for example.
 * This corruption only affects the concat method which will start throwing
 * Catastrophic Errors (#-2147418113).
 *
 * See http://endoflow.com/scratch/corrupted-arrays.html for a test case.
 *
 * Internally goog.array should use this, so that all methods will continue to
 * work on these broken array objects.
 *
 * @param {...*} var_args Items to concatenate.  Arrays will have each item
 *     added, while primitives and objects will be added as is.
 * @return {!Array} The new resultant array.
 */
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(
      goog.array.ARRAY_PROTOTYPE_, arguments);
};


/**
 * Converts an object to an array.
 * @param {goog.array.ArrayLike} object  The object to convert to an array.
 * @return {!Array} The object converted into an array. If object has a
 *     length property, every property indexed with a non-negative number
 *     less than length will be included in the result. If object does not
 *     have a length property, an empty array will be returned.
 */
goog.array.toArray = function(object) {
  var length = object.length;

  // If length is not a number the following it false. This case is kept for
  // backwards compatibility since there are callers that pass objects that are
  // not array like.
  if (length > 0) {
    var rv = new Array(length);
    for (var i = 0; i < length; i++) {
      rv[i] = object[i];
    }
    return rv;
  }
  return [];
};


/**
 * Does a shallow copy of an array.
 * @param {goog.array.ArrayLike} arr  Array or array-like object to clone.
 * @return {!Array} Clone of the input array.
 */
goog.array.clone = goog.array.toArray;


/**
 * Extends an array with another array, element, or "array like" object.
 * This function operates 'in-place', it does not create a new Array.
 *
 * Example:
 * var a = [];
 * goog.array.extend(a, [0, 1]);
 * a; // [0, 1]
 * goog.array.extend(a, 2);
 * a; // [0, 1, 2]
 *
 * @param {Array} arr1  The array to modify.
 * @param {...*} var_args The elements or arrays of elements to add to arr1.
 */
goog.array.extend = function(arr1, var_args) {
  for (var i = 1; i < arguments.length; i++) {
    var arr2 = arguments[i];
    // If we have an Array or an Arguments object we can just call push
    // directly.
    var isArrayLike;
    if (goog.isArray(arr2) ||
        // Detect Arguments. ES5 says that the [[Class]] of an Arguments object
        // is "Arguments" but only V8 and JSC/Safari gets this right. We instead
        // detect Arguments by checking for array like and presence of "callee".
        (isArrayLike = goog.isArrayLike(arr2)) &&
            // The getter for callee throws an exception in strict mode
            // according to section 10.6 in ES5 so check for presence instead.
            arr2.hasOwnProperty('callee')) {
      arr1.push.apply(arr1, arr2);

    } else if (isArrayLike) {
      // Otherwise loop over arr2 to prevent copying the object.
      var len1 = arr1.length;
      var len2 = arr2.length;
      for (var j = 0; j < len2; j++) {
        arr1[len1 + j] = arr2[j];
      }
    } else {
      arr1.push(arr2);
    }
  }
};


/**
 * Adds or removes elements from an array. This is a generic version of Array
 * splice. This means that it might work on other objects similar to arrays,
 * such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {number|undefined} index The index at which to start changing the
 *     array. If not defined, treated as 0.
 * @param {number} howMany How many elements to remove (0 means no removal. A
 *     value below 0 is treated as zero and so is any other non number. Numbers
 *     are floored).
 * @param {...*} var_args Optional, additional elements to insert into the
 *     array.
 * @return {!Array} the removed elements.
 */
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);

  return goog.array.ARRAY_PROTOTYPE_.splice.apply(
      arr, goog.array.slice(arguments, 1));
};


/**
 * Returns a new array from a segment of an array. This is a generic version of
 * Array slice. This means that it might work on other objects similar to
 * arrays, such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array from which to copy a segment.
 * @param {number} start The index of the first element to copy.
 * @param {number=} opt_end The index after the last element to copy.
 * @return {!Array} A new array containing the specified segment of the original
 *     array.
 */
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);

  // passing 1 arg to slice is not the same as passing 2 where the second is
  // null or undefined (in that case the second argument is treated as 0).
  // we could use slice on the arguments object and then use apply instead of
  // testing the length
  if (arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start);
  } else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end);
  }
};


/**
 * Removes all duplicates from an array (retaining only the first
 * occurrence of each array element).  This function modifies the
 * array in place and doesn't change the order of the non-duplicate items.
 *
 * For objects, duplicates are identified as having the same unique ID as
 * defined by {@link goog.getUid}.
 *
 * Runtime: N,
 * Worstcase space: 2N (no dupes)
 *
 * @param {goog.array.ArrayLike} arr The array from which to remove duplicates.
 * @param {Array=} opt_rv An optional array in which to return the results,
 *     instead of performing the removal inplace.  If specified, the original
 *     array will remain unchanged.
 */
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;

  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];

    // Prefix each type with a single character representing the type to
    // prevent conflicting keys (e.g. true and 'true').
    var key = goog.isObject(current) ?
        'o' + goog.getUid(current) :
        (typeof current).charAt(0) + current;

    if (!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current;
    }
  }
  returnArray.length = cursorInsert;
};


/**
 * Searches the specified array for the specified target using the binary
 * search algorithm.  If no opt_compareFn is specified, elements are compared
 * using <code>goog.array.defaultCompare</code>, which compares the elements
 * using the built in < and > operators.  This will produce the expected
 * behavior for homogeneous arrays of String(s) and Number(s). The array
 * specified <b>must</b> be sorted in ascending order (as defined by the
 * comparison function).  If the array is not sorted, results are undefined.
 * If the array contains multiple instances of the specified target value, any
 * of these instances may be found.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} target The sought value.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 */
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr,
      opt_compareFn || goog.array.defaultCompare, false /* isEvaluator */,
      target);
};


/**
 * Selects an index in the specified array using the binary search algorithm.
 * The evaluator receives an element and determines whether the desired index
 * is before, at, or after it.  The evaluator must be consistent (formally,
 * goog.array.map(goog.array.map(arr, evaluator, opt_obj), goog.math.sign)
 * must be monotonically non-increasing).
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {Function} evaluator Evaluator function that receives 3 arguments
 *     (the element, the index and the array). Should return a negative number,
 *     zero, or a positive number depending on whether the desired index is
 *     before, at, or after the element passed to it.
 * @param {Object=} opt_obj The object to be used as the value of 'this'
 *     within evaluator.
 * @return {number} Index of the leftmost element matched by the evaluator, if
 *     such exists; otherwise (-(insertion point) - 1). The insertion point is
 *     the index of the first element for which the evaluator returns negative,
 *     or arr.length if no such element exists. The return value is non-negative
 *     iff a match is found.
 */
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true /* isEvaluator */,
      undefined /* opt_target */, opt_obj);
};


/**
 * Implementation of a binary search algorithm which knows how to use both
 * comparison functions and evaluators. If an evaluator is provided, will call
 * the evaluator with the given optional data object, conforming to the
 * interface defined in binarySelect. Otherwise, if a comparison function is
 * provided, will call the comparison function against the given data object.
 *
 * This implementation purposefully does not use goog.bind or goog.partial for
 * performance reasons.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {Function} compareFn Either an evaluator or a comparison function,
 *     as defined by binarySearch and binarySelect above.
 * @param {boolean} isEvaluator Whether the function is an evaluator or a
 *     comparison function.
 * @param {*=} opt_target If the function is a comparison function, then this is
 *     the target to binary search for.
 * @param {Object=} opt_selfObj If the function is an evaluator, this is an
  *    optional this object for the evaluator.
 * @return {number} Lowest index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 * @private
 */
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target,
    opt_selfObj) {
  var left = 0;  // inclusive
  var right = arr.length;  // exclusive
  var found;
  while (left < right) {
    var middle = (left + right) >> 1;
    var compareResult;
    if (isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr);
    } else {
      compareResult = compareFn(opt_target, arr[middle]);
    }
    if (compareResult > 0) {
      left = middle + 1;
    } else {
      right = middle;
      // We are looking for the lowest index so we can't return immediately.
      found = !compareResult;
    }
  }
  // left is the index if found, or the insertion point otherwise.
  // ~left is a shorthand for -left - 1.
  return found ? left : ~left;
};


/**
 * Sorts the specified array into ascending order.  If no opt_compareFn is
 * specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s), unlike the native sort,
 * but will give unpredictable results for heterogenous lists of strings and
 * numbers with different numbers of digits.
 *
 * This sort is not guaranteed to be stable.
 *
 * Runtime: Same as <code>Array.prototype.sort</code>
 *
 * @param {Array} arr The array to be sorted.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is to be ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 */
goog.array.sort = function(arr, opt_compareFn) {
  // TODO(arv): Update type annotation since null is not accepted.
  goog.asserts.assert(arr.length != null);

  goog.array.ARRAY_PROTOTYPE_.sort.call(
      arr, opt_compareFn || goog.array.defaultCompare);
};


/**
 * Sorts the specified array into ascending order in a stable way.  If no
 * opt_compareFn is specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s).
 *
 * Runtime: Same as <code>Array.prototype.sort</code>, plus an additional
 * O(n) overhead of copying the array twice.
 *
 * @param {Array} arr The array to be sorted.
 * @param {function(?, ?): number=} opt_compareFn Optional comparison function
 *     by which the array is to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.stableSort = function(arr, opt_compareFn) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] = {index: i, value: arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  };
  goog.array.sort(arr, stableCompareFn);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].value;
  }
};


/**
 * Sorts an array of objects by the specified object key and compare
 * function. If no compare function is provided, the key values are
 * compared in ascending order using <code>goog.array.defaultCompare</code>.
 * This won't work for keys that get renamed by the compiler. So use
 * {'foo': 1, 'bar': 2} rather than {foo: 1, bar: 2}.
 * @param {Array.<Object>} arr An array of objects to sort.
 * @param {string} key The object key to sort by.
 * @param {Function=} opt_compareFn The function to use to compare key
 *     values.
 */
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key]);
  });
};


/**
 * Tells if the array is sorted.
 * @param {!Array} arr The array.
 * @param {Function=} opt_compareFn Function to compare the array elements.
 *     Should take 2 arguments to compare, and return a negative number, zero,
 *     or a positive number depending on whether the first argument is less
 *     than, equal to, or greater than the second.
 * @param {boolean=} opt_strict If true no equal elements are allowed.
 * @return {boolean} Whether the array is sorted.
 */
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for (var i = 1; i < arr.length; i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if (compareResult > 0 || compareResult == 0 && opt_strict) {
      return false;
    }
  }
  return true;
};


/**
 * Compares two arrays for equality. Two arrays are considered equal if they
 * have the same length and their corresponding elements are equal according to
 * the comparison function.
 *
 * @param {goog.array.ArrayLike} arr1 The first array to compare.
 * @param {goog.array.ArrayLike} arr2 The second array to compare.
 * @param {Function=} opt_equalsFn Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal. Defaults to {@link goog.array.defaultCompareEquality} which
 *     compares the elements using the built-in '===' operator.
 * @return {boolean} Whether the two arrays are equal.
 */
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) ||
      arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < l; i++) {
    if (!equalsFn(arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};


/**
 * @deprecated Use {@link goog.array.equals}.
 * @param {goog.array.ArrayLike} arr1 See {@link goog.array.equals}.
 * @param {goog.array.ArrayLike} arr2 See {@link goog.array.equals}.
 * @param {Function=} opt_equalsFn See {@link goog.array.equals}.
 * @return {boolean} See {@link goog.array.equals}.
 */
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn);
};


/**
 * 3-way array compare function.
 * @param {!goog.array.ArrayLike} arr1 The first array to compare.
 * @param {!goog.array.ArrayLike} arr2 The second array to compare.
 * @param {(function(?, ?): number)=} opt_compareFn Optional comparison function
 *     by which the array is to be ordered. Should take 2 arguments to compare,
 *     and return a negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @return {number} Negative number, zero, or a positive number depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.compare3 = function(arr1, arr2, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  var l = Math.min(arr1.length, arr2.length);
  for (var i = 0; i < l; i++) {
    var result = compare(arr1[i], arr2[i]);
    if (result != 0) {
      return result;
    }
  }
  return goog.array.defaultCompare(arr1.length, arr2.length);
};


/**
 * Compares its two arguments for order, using the built in < and >
 * operators.
 * @param {*} a The first object to be compared.
 * @param {*} b The second object to be compared.
 * @return {number} A negative number, zero, or a positive number as the first
 *     argument is less than, equal to, or greater than the second.
 */
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};


/**
 * Compares its two arguments for equality, using the built in === operator.
 * @param {*} a The first object to compare.
 * @param {*} b The second object to compare.
 * @return {boolean} True if the two arguments are equal, false otherwise.
 */
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};


/**
 * Inserts a value into a sorted array. The array is not modified if the
 * value is already present.
 * @param {Array} array The array to modify.
 * @param {*} value The object to insert.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {boolean} True if an element was inserted.
 */
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};


/**
 * Removes a value from a sorted array.
 * @param {Array} array The array to modify.
 * @param {*} value The object to remove.
 * @param {Function=} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative number, zero, or a positive number depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {boolean} True if an element was removed.
 */
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return (index >= 0) ? goog.array.removeAt(array, index) : false;
};


/**
 * Splits an array into disjoint buckets according to a splitting function.
 * @param {Array} array The array.
 * @param {Function} sorter Function to call for every element.  This
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a valid object key (a string, number, etc), or undefined, if
 *     that object should not be placed in a bucket.
 * @return {!Object} An object, with keys being all of the unique return values
 *     of sorter, and values being arrays containing the items for
 *     which the splitter returned that key.
 */
goog.array.bucket = function(array, sorter) {
  var buckets = {};

  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if (goog.isDef(key)) {
      // Push the value to the right bucket, creating it if necessary.
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }

  return buckets;
};


/**
 * Returns an array consisting of the given value repeated N times.
 *
 * @param {*} value The value to repeat.
 * @param {number} n The repeat count.
 * @return {!Array} An array with the repeated value.
 */
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
};


/**
 * Returns an array consisting of every argument with all arrays
 * expanded in-place recursively.
 *
 * @param {...*} var_args The values to flatten.
 * @return {!Array.<*>} An array containing the flattened values.
 */
goog.array.flatten = function(var_args) {
  var result = [];
  for (var i = 0; i < arguments.length; i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element));
    } else {
      result.push(element);
    }
  }
  return result;
};


/**
 * Rotates an array in-place. After calling this method, the element at
 * index i will be the element previously at index (i - n) %
 * array.length, for all values of i between 0 and array.length - 1,
 * inclusive.
 *
 * For example, suppose list comprises [t, a, n, k, s]. After invoking
 * rotate(array, 1) (or rotate(array, -4)), array will comprise [s, t, a, n, k].
 *
 * @param {!Array.<*>} array The array to rotate.
 * @param {number} n The amount to rotate.
 * @return {!Array.<*>} The array.
 */
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);

  if (array.length) {
    n %= array.length;
    if (n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n));
    } else if (n < 0) {
      goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n));
    }
  }
  return array;
};


/**
 * Creates a new array for which the element at position i is an array of the
 * ith element of the provided arrays.  The returned array will only be as long
 * as the shortest array provided; additional values are ignored.  For example,
 * the result of zipping [1, 2] and [3, 4, 5] is [[1,3], [2, 4]].
 *
 * This is similar to the zip() function in Python.  See {@link
 * http://docs.python.org/library/functions.html#zip}
 *
 * @param {...!goog.array.ArrayLike} var_args Arrays to be combined.
 * @return {!Array.<!Array>} A new array of arrays created from provided arrays.
 */
goog.array.zip = function(var_args) {
  if (!arguments.length) {
    return [];
  }
  var result = [];
  for (var i = 0; true; i++) {
    var value = [];
    for (var j = 0; j < arguments.length; j++) {
      var arr = arguments[j];
      // If i is larger than the array length, this is the shortest array.
      if (i >= arr.length) {
        return result;
      }
      value.push(arr[i]);
    }
    result.push(value);
  }
};


/**
 * Shuffles the values in the specified array using the Fisher-Yates in-place
 * shuffle (also known as the Knuth Shuffle). By default, calls Math.random()
 * and so resets the state of that random number generator. Similarly, may reset
 * the state of the any other specified random number generator.
 *
 * Runtime: O(n)
 *
 * @param {!Array} arr The array to be shuffled.
 * @param {Function=} opt_randFn Optional random function to use for shuffling.
 *     Takes no arguments, and returns a random number on the interval [0, 1).
 *     Defaults to Math.random() using JavaScript's built-in Math library.
 */
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;

  for (var i = arr.length - 1; i > 0; i--) {
    // Choose a random array index in [0, i] (inclusive with i).
    var j = Math.floor(randFn() * (i + 1));

    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Protocol Buffer (Message) Descriptor class.
 */

goog.provide('goog.proto2.Descriptor');
goog.provide('goog.proto2.Metadata');

goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.proto2.Util');


/**
 * @typedef {{name: (string|undefined),
 *            fullName: (string|undefined),
 *            containingType: (goog.proto2.Message|undefined)}}
 */
goog.proto2.Metadata;



/**
 * A class which describes a Protocol Buffer 2 Message.
 *
 * @param {function(new:goog.proto2.Message)} messageType Constructor for
 *      the message class that this descriptor describes.
 * @param {!goog.proto2.Metadata} metadata The metadata about the message that
 *      will be used to construct this descriptor.
 * @param {Array.<!goog.proto2.FieldDescriptor>} fields The fields of the
 *      message described by this descriptor.
 *
 * @constructor
 */
goog.proto2.Descriptor = function(messageType, metadata, fields) {

  /**
   * @type {function(new:goog.proto2.Message)}
   * @private
   */
  this.messageType_ = messageType;

  /**
   * @type {?string}
   * @private
   */
  this.name_ = metadata.name || null;

  /**
   * @type {?string}
   * @private
   */
  this.fullName_ = metadata.fullName || null;

  /**
   * @type {goog.proto2.Message|undefined}
   * @private
   */
  this.containingType_ = metadata.containingType;

  /**
   * The fields of the message described by this descriptor.
   * @type {!Object.<number, !goog.proto2.FieldDescriptor>}
   * @private
   */
  this.fields_ = {};

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    this.fields_[field.getTag()] = field;
  }
};


/**
 * Returns the name of the message, if any.
 *
 * @return {?string} The name.
 */
goog.proto2.Descriptor.prototype.getName = function() {
  return this.name_;
};


/**
 * Returns the full name of the message, if any.
 *
 * @return {?string} The name.
 */
goog.proto2.Descriptor.prototype.getFullName = function() {
  return this.fullName_;
};


/**
 * Returns the descriptor of the containing message type or null if none.
 *
 * @return {goog.proto2.Descriptor} The descriptor.
 */
goog.proto2.Descriptor.prototype.getContainingType = function() {
  if (!this.containingType_) {
    return null;
  }

  return this.containingType_.getDescriptor();
};


/**
 * Returns the fields in the message described by this descriptor ordered by
 * tag.
 *
 * @return {!Array.<!goog.proto2.FieldDescriptor>} The array of field
 *     descriptors.
 */
goog.proto2.Descriptor.prototype.getFields = function() {
  /**
   * @param {!goog.proto2.FieldDescriptor} fieldA First field.
   * @param {!goog.proto2.FieldDescriptor} fieldB Second field.
   * @return {number} Negative if fieldA's tag number is smaller, positive
   *     if greater, zero if the same.
   */
  function tagComparator(fieldA, fieldB) {
    return fieldA.getTag() - fieldB.getTag();
  };

  var fields = goog.object.getValues(this.fields_);
  goog.array.sort(fields, tagComparator);

  return fields;
};


/**
 * Returns the fields in the message as a key/value map, where the key is
 * the tag number of the field. DO NOT MODIFY THE RETURNED OBJECT. We return
 * the actual, internal, fields map for performance reasons, and changing the
 * map can result in undefined behavior of this library.
 *
 * @return {!Object.<number, !goog.proto2.FieldDescriptor>} The field map.
 */
goog.proto2.Descriptor.prototype.getFieldsMap = function() {
  return this.fields_;
};


/**
 * Returns the field matching the given name, if any. Note that
 * this method searches over the *original* name of the field,
 * not the camelCase version.
 *
 * @param {string} name The field name for which to search.
 *
 * @return {goog.proto2.FieldDescriptor} The field found, if any.
 */
goog.proto2.Descriptor.prototype.findFieldByName = function(name) {
  var valueFound = goog.object.findValue(this.fields_,
      function(field, key, obj) {
        return field.getName() == name;
      });

  return /** @type {goog.proto2.FieldDescriptor} */ (valueFound) || null;
};


/**
 * Returns the field matching the given tag number, if any.
 *
 * @param {number|string} tag The field tag number for which to search.
 *
 * @return {goog.proto2.FieldDescriptor} The field found, if any.
 */
goog.proto2.Descriptor.prototype.findFieldByTag = function(tag) {
  goog.proto2.Util.assert(goog.string.isNumeric(tag));
  return this.fields_[parseInt(tag, 10)] || null;
};


/**
 * Creates an instance of the message type that this descriptor
 * describes.
 *
 * @return {!goog.proto2.Message} The instance of the message.
 */
goog.proto2.Descriptor.prototype.createMessageInstance = function() {
  return new this.messageType_;
};
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Protocol Buffer Message base class.
 */

goog.provide('goog.proto2.Message');

goog.require('goog.proto2.Descriptor');
goog.require('goog.proto2.FieldDescriptor');
goog.require('goog.proto2.Util');
goog.require('goog.string');



/**
 * Abstract base class for all Protocol Buffer 2 messages. It will be
 * subclassed in the code generated by the Protocol Compiler. Any other
 * subclasses are prohibited.
 * @constructor
 */
goog.proto2.Message = function() {
  /**
   * Stores the field values in this message. Keyed by the tag of the fields.
   * @type {*}
   * @private
   */
  this.values_ = {};

  // The descriptor_ is static to the message function that is being created.
  // Therefore, we retrieve it via the constructor.

  /**
   * Stores the information (i.e. metadata) about this message.
   * @type {!goog.proto2.Descriptor}
   * @private
   */
  this.descriptor_ = this.constructor.descriptor_;

  /**
   * Stores the field information (i.e. metadata) about this message.
   * @type {Object.<number, !goog.proto2.FieldDescriptor>}
   * @private
   */
  this.fields_ = this.descriptor_.getFieldsMap();

  /**
   * The lazy deserializer for this message instance, if any.
   * @type {goog.proto2.LazyDeserializer}
   * @private
   */
  this.lazyDeserializer_ = null;

  /**
   * A map of those fields deserialized, from tag number to their deserialized
   * value.
   * @type {Object}
   * @private
   */
  this.deserializedFields_ = null;
};


/**
 * An enumeration defining the possible field types.
 * Should be a mirror of that defined in descriptor.h.
 *
 * TODO(user): Remove this alias.  The code generator generates code that
 * references this enum, so it needs to exist until the code generator is
 * changed.  The enum was moved to from Message to FieldDescriptor to avoid a
 * dependency cycle.
 *
 * Use goog.proto2.FieldDescriptor.FieldType instead.
 *
 * @enum {number}
 */
goog.proto2.Message.FieldType = {
  DOUBLE: 1,
  FLOAT: 2,
  INT64: 3,
  UINT64: 4,
  INT32: 5,
  FIXED64: 6,
  FIXED32: 7,
  BOOL: 8,
  STRING: 9,
  GROUP: 10,
  MESSAGE: 11,
  BYTES: 12,
  UINT32: 13,
  ENUM: 14,
  SFIXED32: 15,
  SFIXED64: 16,
  SINT32: 17,
  SINT64: 18
};


/**
 * Initializes the message with a lazy deserializer and its associated data.
 * This method should be called by internal methods ONLY.
 *
 * @param {goog.proto2.LazyDeserializer} deserializer The lazy deserializer to
 *   use to decode the data on the fly.
 *
 * @param {*} data The data to decode/deserialize.
 */
goog.proto2.Message.prototype.initializeForLazyDeserializer = function(
    deserializer, data) {

  this.lazyDeserializer_ = deserializer;
  this.values_ = data;
  this.deserializedFields_ = {};
};


/**
 * Sets the value of an unknown field, by tag.
 *
 * @param {number} tag The tag of an unknown field (must be >= 1).
 * @param {*} value The value for that unknown field.
 */
goog.proto2.Message.prototype.setUnknown = function(tag, value) {
  goog.proto2.Util.assert(!this.fields_[tag],
                          'Field is not unknown in this message');

  goog.proto2.Util.assert(tag >= 1, 'Tag is not valid');
  goog.proto2.Util.assert(value !== null, 'Value cannot be null');

  this.values_[tag] = value;
  if (this.deserializedFields_) {
    delete this.deserializedFields_[tag];
  }
};


/**
 * Iterates over all the unknown fields in the message.
 *
 * @param {function(number, *)} callback A callback method
 *     which gets invoked for each unknown field.
 * @param {Object=} opt_scope The scope under which to execute the callback.
 *     If not given, the current message will be used.
 */
goog.proto2.Message.prototype.forEachUnknown = function(callback, opt_scope) {
  var scope = opt_scope || this;
  for (var key in this.values_) {
    if (!this.fields_[/** @type {number} */ (key)]) {
      callback.call(scope, Number(key), this.values_[key]);
    }
  }
};


/**
 * Returns the descriptor which describes the current message.
 *
 * @return {goog.proto2.Descriptor} The descriptor.
 */
goog.proto2.Message.prototype.getDescriptor = function() {
  return this.descriptor_;
};


/**
 * Returns whether there is a value stored at the field specified by the
 * given field descriptor.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to check
 *     if there is a value.
 *
 * @return {boolean} True if a value was found.
 */
goog.proto2.Message.prototype.has = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.has$Value(field.getTag());
};


/**
 * Returns the array of values found for the given repeated field.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to
 *     return the values.
 *
 * @return {!Array} The values found.
 */
goog.proto2.Message.prototype.arrayOf = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.array$Values(field.getTag());
};


/**
 * Returns the number of values stored in the given field.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to count
 *     the number of values.
 *
 * @return {number} The count of the values in the given field.
 */
goog.proto2.Message.prototype.countOf = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.count$Values(field.getTag());
};


/**
 * Returns the value stored at the field specified by the
 * given field descriptor.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to get the
 *     value.
 * @param {number=} opt_index If the field is repeated, the index to use when
 *     looking up the value.
 *
 * @return {*} The value found or null if none.
 */
goog.proto2.Message.prototype.get = function(field, opt_index) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.get$Value(field.getTag(), opt_index);
};


/**
 * Returns the value stored at the field specified by the
 * given field descriptor or the default value if none exists.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to get the
 *     value.
 * @param {number=} opt_index If the field is repeated, the index to use when
 *     looking up the value.
 *
 * @return {*} The value found or the default if none.
 */
goog.proto2.Message.prototype.getOrDefault = function(field, opt_index) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  return this.get$ValueOrDefault(field.getTag(), opt_index);
};


/**
 * Stores the given value to the field specified by the
 * given field descriptor. Note that the field must not be repeated.
 *
 * @param {goog.proto2.FieldDescriptor} field The field for which to set
 *     the value.
 * @param {*} value The new value for the field.
 */
goog.proto2.Message.prototype.set = function(field, value) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  this.set$Value(field.getTag(), value);
};


/**
 * Adds the given value to the field specified by the
 * given field descriptor. Note that the field must be repeated.
 *
 * @param {goog.proto2.FieldDescriptor} field The field in which to add the
 *     the value.
 * @param {*} value The new value to add to the field.
 */
goog.proto2.Message.prototype.add = function(field, value) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  this.add$Value(field.getTag(), value);
};


/**
 * Clears the field specified.
 *
 * @param {goog.proto2.FieldDescriptor} field The field to clear.
 */
goog.proto2.Message.prototype.clear = function(field) {
  goog.proto2.Util.assert(
      field.getContainingType() == this.descriptor_,
      'The current message does not contain the given field');

  this.clear$Field(field.getTag());
};


/**
 * Compares this message with another one ignoring the unknown fields.
 * @param {*} other The other message.
 * @return {boolean} Whether they are equal. Returns false if the {@code other}
 *     argument is a different type of message or not a message.
 */
goog.proto2.Message.prototype.equals = function(other) {
  if (!other || this.constructor != other.constructor) {
    return false;
  }

  var fields = this.getDescriptor().getFields();
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (this.has(field) != other.has(field)) {
      return false;
    }

    if (this.has(field)) {
      var isComposite = field.isCompositeType();

      function fieldsEqual(value1, value2) {
        return isComposite ? value1.equals(value2) : value1 == value2;
      }

      var thisValue = this.getValueForField_(field);
      var otherValue = other.getValueForField_(field);

      if (field.isRepeated()) {
        // In this case thisValue and otherValue are arrays.
        if (thisValue.length != otherValue.length) {
          return false;
        }
        for (var j = 0; j < thisValue.length; j++) {
          if (!fieldsEqual(thisValue[j], otherValue[j])) {
            return false;
          }
        }
      } else if (!fieldsEqual(thisValue, otherValue)) {
        return false;
      }
    }
  }

  return true;
};


/**
 * Recursively copies the known fields from the given message to this message.
 * Removes the fields which are not present in the source message.
 * @param {!goog.proto2.Message} message The source message.
 */
goog.proto2.Message.prototype.copyFrom = function(message) {
  goog.proto2.Util.assert(this.constructor == message.constructor,
      'The source message must have the same type.');

  this.values_ = {};
  if (this.deserializedFields_) {
    this.deserializedFields_ = {};
  }
  this.mergeFrom(message);
};


/**
 * Merges the given message into this message.
 *
 * Singular fields will be overwritten, except for embedded messages which will
 * be merged. Repeated fields will be concatenated.
 * @param {!goog.proto2.Message} message The source message.
 */
goog.proto2.Message.prototype.mergeFrom = function(message) {
  goog.proto2.Util.assert(this.constructor == message.constructor,
      'The source message must have the same type.');
  var fields = this.getDescriptor().getFields();

  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (message.has(field)) {
      if (this.deserializedFields_) {
        delete this.deserializedFields_[field.getTag()];
      }

      var isComposite = field.isCompositeType();
      if (field.isRepeated()) {
        var values = message.arrayOf(field);
        for (var j = 0; j < values.length; j++) {
          this.add(field, isComposite ? values[j].clone() : values[j]);
        }
      } else {
        var value = message.getValueForField_(field);
        if (isComposite) {
          var child = this.getValueForField_(field);
          if (child) {
            child.mergeFrom(value);
          } else {
            this.set(field, value.clone());
          }
        } else {
          this.set(field, value);
        }
      }
    }
  }
};


/**
 * @return {!goog.proto2.Message} Recursive clone of the message only including
 *     the known fields.
 */
goog.proto2.Message.prototype.clone = function() {
  var clone = new this.constructor;
  clone.copyFrom(this);
  return clone;
};


/**
 * Fills in the protocol buffer with default values. Any fields that are
 * already set will not be overridden.
 * @param {boolean} simpleFieldsToo If true, all fields will be initialized;
 *     if false, only the nested messages and groups.
 */
goog.proto2.Message.prototype.initDefaults = function(simpleFieldsToo) {
  var fields = this.getDescriptor().getFields();
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var tag = field.getTag();
    var isComposite = field.isCompositeType();

    // Initialize missing fields.
    if (!this.has(field) && !field.isRepeated()) {
      if (isComposite) {
        this.values_[tag] = new /** @type {Function} */ (field.getNativeType());
      } else if (simpleFieldsToo) {
        this.values_[tag] = field.getDefaultValue();
      }
    }

    // Fill in the existing composite fields recursively.
    if (isComposite) {
      if (field.isRepeated()) {
        var values = this.array$Values(tag);
        for (var j = 0; j < values.length; j++) {
          values[j].initDefaults(simpleFieldsToo);
        }
      } else {
        this.get$Value(tag).initDefaults(simpleFieldsToo);
      }
    }
  }
};


/**
 * Returns the field in this message by the given tag number. If no
 * such field exists, throws an exception.
 *
 * @param {number} tag The field's tag index.
 * @return {!goog.proto2.FieldDescriptor} The descriptor for the field.
 * @private
 */
goog.proto2.Message.prototype.getFieldByTag_ = function(tag) {
  goog.proto2.Util.assert(this.fields_[tag],
                          'No field found for the given tag');

  return this.fields_[tag];
};


/**
 * Returns the whether or not the field indicated by the given tag
 * has a value.
 *
 * GENERATED CODE USE ONLY. Basis of the has{Field} methods.
 *
 * @param {number} tag The tag.
 *
 * @return {boolean} Whether the message has a value for the field.
 */
goog.proto2.Message.prototype.has$Value = function(tag) {
  goog.proto2.Util.assert(this.fields_[tag],
                          'No field found for the given tag');

  return tag in this.values_ && goog.isDef(this.values_[tag]) &&
      this.values_[tag] !== null;
};


/**
 * Returns the value for the given field. If a lazy deserializer is
 * instantiated, lazily deserializes the field if required before returning the
 * value.
 *
 * @param {goog.proto2.FieldDescriptor} field The field.
 * @return {*} The field value, if any.
 * @private
 */
goog.proto2.Message.prototype.getValueForField_ = function(field) {
  // Retrieve the current value, which may still be serialized.
  var tag = field.getTag();
  if (!tag in this.values_) {
    return null;
  }

  var value = this.values_[tag];
  if (value == null) {
    return null;
  }

  // If we have a lazy deserializer, then ensure that the field is
  // properly deserialized.
  if (this.lazyDeserializer_) {
    // If the tag is not deserialized, then we must do so now. Deserialize
    // the field's value via the deserializer.
    if (!(tag in this.deserializedFields_)) {
      var deserializedValue = this.lazyDeserializer_.deserializeField(
          this, field, value);
      this.deserializedFields_[tag] = deserializedValue;
      return deserializedValue;
    }

    return this.deserializedFields_[tag];
  }

  // Otherwise, just return the value.
  return value;
};


/**
 * Gets the value at the field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the get{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {number=} opt_index If the field is a repeated field, the index
 *     at which to get the value.
 *
 * @return {*} The value found or null for none.
 * @protected
 */
goog.proto2.Message.prototype.get$Value = function(tag, opt_index) {
  var field = this.getFieldByTag_(tag);
  var value = this.getValueForField_(field);

  if (field.isRepeated()) {
    goog.proto2.Util.assert(goog.isArray(value));

    var index = opt_index || 0;
    goog.proto2.Util.assert(index >= 0 && index < value.length,
        'Given index is out of bounds');

    return value[index];
  }

  goog.proto2.Util.assert(!goog.isArray(value));
  return value;
};


/**
 * Gets the value at the field indicated by the given tag or the default value
 * if none.
 *
 * GENERATED CODE USE ONLY. Basis of the get{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {number=} opt_index If the field is a repeated field, the index
 *     at which to get the value.
 *
 * @return {*} The value found or the default value if none set.
 * @protected
 */
goog.proto2.Message.prototype.get$ValueOrDefault = function(tag, opt_index) {

  if (!this.has$Value(tag)) {
    // Return the default value.
    var field = this.getFieldByTag_(tag);
    return field.getDefaultValue();
  }

  return this.get$Value(tag, opt_index);
};


/**
 * Gets the values at the field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the {field}Array methods.
 *
 * @param {number} tag The field's tag index.
 *
 * @return {!Array} The values found. If none, returns an empty array.
 * @protected
 */
goog.proto2.Message.prototype.array$Values = function(tag) {
  goog.proto2.Util.assert(this.getFieldByTag_(tag).isRepeated(),
      'Cannot call fieldArray on a non-repeated field');
  var field = this.getFieldByTag_(tag);
  var value = this.getValueForField_(field);
  goog.proto2.Util.assert(value == null || goog.isArray(value));
  return (/** @type {Array} */value) || [];
};


/**
 * Returns the number of values stored in the field by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the {field}Count methods.
 *
 * @param {number} tag The tag.
 *
 * @return {number} The number of values.
 * @protected
 */
goog.proto2.Message.prototype.count$Values = function(tag) {
  var field = this.getFieldByTag_(tag);

  if (field.isRepeated()) {
    if (this.has$Value(tag)) {
      goog.proto2.Util.assert(goog.isArray(this.values_[tag]));
    }

    return this.has$Value(tag) ? this.values_[tag].length : 0;
  } else {
    return this.has$Value(tag) ? 1 : 0;
  }
};


/**
 * Sets the value of the *non-repeating* field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the set{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {*} value The field's value.
 * @protected
 */
goog.proto2.Message.prototype.set$Value = function(tag, value) {
  if (goog.proto2.Util.conductChecks()) {
    var field = this.getFieldByTag_(tag);

    goog.proto2.Util.assert(!field.isRepeated(),
                            'Cannot call set on a repeated field');

    this.checkFieldType_(field, value);
  }

  this.values_[tag] = value;
  if (this.deserializedFields_) {
    this.deserializedFields_[tag] = value;
  }
};


/**
 * Adds the value to the *repeating* field indicated by the given tag.
 *
 * GENERATED CODE USE ONLY. Basis of the add{Field} methods.
 *
 * @param {number} tag The field's tag index.
 * @param {*} value The value to add.
 * @protected
 */
goog.proto2.Message.prototype.add$Value = function(tag, value) {
  if (goog.proto2.Util.conductChecks()) {
    var field = this.getFieldByTag_(tag);

    goog.proto2.Util.assert(field.isRepeated(),
                            'Cannot call add on a non-repeated field');

    this.checkFieldType_(field, value);
  }

  if (!this.values_[tag]) {
    this.values_[tag] = [];
  }

  this.values_[tag].push(value);
  if (this.deserializedFields_) {
    delete this.deserializedFields_[tag];
  }
};


/**
 * Ensures that the value being assigned to the given field
 * is valid.
 *
 * @param {!goog.proto2.FieldDescriptor} field The field being assigned.
 * @param {*} value The value being assigned.
 * @private
 */
goog.proto2.Message.prototype.checkFieldType_ = function(field, value) {
  goog.proto2.Util.assert(value !== null);

  var nativeType = field.getNativeType();
  if (nativeType === String) {
    goog.proto2.Util.assert(typeof value === 'string',
                            'Expected value of type string');
  } else if (nativeType === Boolean) {
    goog.proto2.Util.assert(typeof value === 'boolean',
                            'Expected value of type boolean');
  } else if (nativeType === Number) {
    goog.proto2.Util.assert(typeof value === 'number',
                            'Expected value of type number');
  } else if (field.getFieldType() ==
             goog.proto2.FieldDescriptor.FieldType.ENUM) {
    goog.proto2.Util.assert(typeof value === 'number',
                            'Expected an enum value, which is a number');
  } else {
    goog.proto2.Util.assert(value instanceof nativeType,
                            'Expected a matching message type');
  }
};


/**
 * Clears the field specified by tag.
 *
 * GENERATED CODE USE ONLY. Basis of the clear{Field} methods.
 *
 * @param {number} tag The tag of the field to clear.
 * @protected
 */
goog.proto2.Message.prototype.clear$Field = function(tag) {
  goog.proto2.Util.assert(this.getFieldByTag_(tag), 'Unknown field');
  delete this.values_[tag];
  if (this.deserializedFields_) {
    delete this.deserializedFields_[tag];
  }
};


/**
 * Sets the metadata that represents the definition of this message.
 *
 * GENERATED CODE USE ONLY. Called when constructing message classes.
 *
 * @param {Function} messageType Constructor for the message type to
 *     which this metadata applies.
 * @param {Object} metadataObj The object containing the metadata.
 */
goog.proto2.Message.set$Metadata = function(messageType, metadataObj) {
  var fields = [];
  var descriptorInfo;

  for (var key in metadataObj) {
    if (!metadataObj.hasOwnProperty(key)) {
      continue;
    }

    goog.proto2.Util.assert(goog.string.isNumeric(key), 'Keys must be numeric');

    if (key == 0) {
      descriptorInfo = metadataObj[0];
      continue;
    }

    // Create the field descriptor.
    fields.push(
        new goog.proto2.FieldDescriptor(messageType, key, metadataObj[key]));
  }

  goog.proto2.Util.assert(descriptorInfo);

  // Create the descriptor.
  messageType.descriptor_ =
      new goog.proto2.Descriptor(messageType, descriptorInfo, fields);

  messageType.getDescriptor = function() {
    return messageType.descriptor_;
  };
};
// Generated by the protocol buffer compiler.  DO NOT EDIT!
// source: ql2.proto

/**
 * @fileoverview Generated Protocol Buffer code for file ql2.proto.
 */

goog.provide('VersionDummy');
goog.provide('VersionDummy.Version');
goog.provide('Query');
goog.provide('Query.QueryType');
goog.provide('Query.AssocPair');
goog.provide('Frame');
goog.provide('Frame.FrameType');
goog.provide('Backtrace');
goog.provide('Response');
goog.provide('Response.ResponseType');
goog.provide('Datum');
goog.provide('Datum.DatumType');
goog.provide('Datum.AssocPair');
goog.provide('Term');
goog.provide('Term.TermType');
goog.provide('Term.AssocPair');

goog.require('goog.proto2.Message');



/**
 * Message VersionDummy.
 * @constructor
 * @extends {goog.proto2.Message}
 */
VersionDummy = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(VersionDummy, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!VersionDummy} The cloned message.
 * @override
 */
VersionDummy.prototype.clone;


/**
 * Enumeration Version.
 * @enum {number}
 */
VersionDummy.Version = {
  V0_1: 1063369270
};



/**
 * Message Query.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Query = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Query, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Query} The cloned message.
 * @override
 */
Query.prototype.clone;


/**
 * Gets the value of the type field.
 * @return {?Query.QueryType} The value.
 */
Query.prototype.getType = function() {
  return /** @type {?Query.QueryType} */ (this.get$Value(1));
};


/**
 * Gets the value of the type field or the default value if not set.
 * @return {Query.QueryType} The value.
 */
Query.prototype.getTypeOrDefault = function() {
  return /** @type {Query.QueryType} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the type field.
 * @param {Query.QueryType} value The value.
 */
Query.prototype.setType = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the type field has a value.
 */
Query.prototype.hasType = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the type field.
 */
Query.prototype.typeCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the type field.
 */
Query.prototype.clearType = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the query field.
 * @return {Term} The value.
 */
Query.prototype.getQuery = function() {
  return /** @type {Term} */ (this.get$Value(2));
};


/**
 * Gets the value of the query field or the default value if not set.
 * @return {!Term} The value.
 */
Query.prototype.getQueryOrDefault = function() {
  return /** @type {!Term} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the query field.
 * @param {!Term} value The value.
 */
Query.prototype.setQuery = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the query field has a value.
 */
Query.prototype.hasQuery = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the query field.
 */
Query.prototype.queryCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the query field.
 */
Query.prototype.clearQuery = function() {
  this.clear$Field(2);
};


/**
 * Gets the value of the token field.
 * @return {?string} The value.
 */
Query.prototype.getToken = function() {
  return /** @type {?string} */ (this.get$Value(3));
};


/**
 * Gets the value of the token field or the default value if not set.
 * @return {string} The value.
 */
Query.prototype.getTokenOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(3));
};


/**
 * Sets the value of the token field.
 * @param {string} value The value.
 */
Query.prototype.setToken = function(value) {
  this.set$Value(3, value);
};


/**
 * @return {boolean} Whether the token field has a value.
 */
Query.prototype.hasToken = function() {
  return this.has$Value(3);
};


/**
 * @return {number} The number of values in the token field.
 */
Query.prototype.tokenCount = function() {
  return this.count$Values(3);
};


/**
 * Clears the values in the token field.
 */
Query.prototype.clearToken = function() {
  this.clear$Field(3);
};


/**
 * Gets the value of the OBSOLETE_noreply field.
 * @return {?boolean} The value.
 */
Query.prototype.getOBSOLETENoreply = function() {
  return /** @type {?boolean} */ (this.get$Value(4));
};


/**
 * Gets the value of the OBSOLETE_noreply field or the default value if not set.
 * @return {boolean} The value.
 */
Query.prototype.getOBSOLETENoreplyOrDefault = function() {
  return /** @type {boolean} */ (this.get$ValueOrDefault(4));
};


/**
 * Sets the value of the OBSOLETE_noreply field.
 * @param {boolean} value The value.
 */
Query.prototype.setOBSOLETENoreply = function(value) {
  this.set$Value(4, value);
};


/**
 * @return {boolean} Whether the OBSOLETE_noreply field has a value.
 */
Query.prototype.hasOBSOLETENoreply = function() {
  return this.has$Value(4);
};


/**
 * @return {number} The number of values in the OBSOLETE_noreply field.
 */
Query.prototype.oBSOLETENoreplyCount = function() {
  return this.count$Values(4);
};


/**
 * Clears the values in the OBSOLETE_noreply field.
 */
Query.prototype.clearOBSOLETENoreply = function() {
  this.clear$Field(4);
};


/**
 * Gets the value of the global_optargs field at the index given.
 * @param {number} index The index to lookup.
 * @return {Query.AssocPair} The value.
 */
Query.prototype.getGlobalOptargs = function(index) {
  return /** @type {Query.AssocPair} */ (this.get$Value(6, index));
};


/**
 * Gets the value of the global_optargs field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Query.AssocPair} The value.
 */
Query.prototype.getGlobalOptargsOrDefault = function(index) {
  return /** @type {!Query.AssocPair} */ (this.get$ValueOrDefault(6, index));
};


/**
 * Adds a value to the global_optargs field.
 * @param {!Query.AssocPair} value The value to add.
 */
Query.prototype.addGlobalOptargs = function(value) {
  this.add$Value(6, value);
};


/**
 * Returns the array of values in the global_optargs field.
 * @return {!Array.<!Query.AssocPair>} The values in the field.
 */
Query.prototype.globalOptargsArray = function() {
  return /** @type {!Array.<!Query.AssocPair>} */ (this.array$Values(6));
};


/**
 * @return {boolean} Whether the global_optargs field has a value.
 */
Query.prototype.hasGlobalOptargs = function() {
  return this.has$Value(6);
};


/**
 * @return {number} The number of values in the global_optargs field.
 */
Query.prototype.globalOptargsCount = function() {
  return this.count$Values(6);
};


/**
 * Clears the values in the global_optargs field.
 */
Query.prototype.clearGlobalOptargs = function() {
  this.clear$Field(6);
};


/**
 * Enumeration QueryType.
 * @enum {number}
 */
Query.QueryType = {
  START: 1,
  CONTINUE: 2,
  STOP: 3
};



/**
 * Message AssocPair.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Query.AssocPair = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Query.AssocPair, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Query.AssocPair} The cloned message.
 * @override
 */
Query.AssocPair.prototype.clone;


/**
 * Gets the value of the key field.
 * @return {?string} The value.
 */
Query.AssocPair.prototype.getKey = function() {
  return /** @type {?string} */ (this.get$Value(1));
};


/**
 * Gets the value of the key field or the default value if not set.
 * @return {string} The value.
 */
Query.AssocPair.prototype.getKeyOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the key field.
 * @param {string} value The value.
 */
Query.AssocPair.prototype.setKey = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the key field has a value.
 */
Query.AssocPair.prototype.hasKey = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the key field.
 */
Query.AssocPair.prototype.keyCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the key field.
 */
Query.AssocPair.prototype.clearKey = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the val field.
 * @return {Term} The value.
 */
Query.AssocPair.prototype.getVal = function() {
  return /** @type {Term} */ (this.get$Value(2));
};


/**
 * Gets the value of the val field or the default value if not set.
 * @return {!Term} The value.
 */
Query.AssocPair.prototype.getValOrDefault = function() {
  return /** @type {!Term} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the val field.
 * @param {!Term} value The value.
 */
Query.AssocPair.prototype.setVal = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the val field has a value.
 */
Query.AssocPair.prototype.hasVal = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the val field.
 */
Query.AssocPair.prototype.valCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the val field.
 */
Query.AssocPair.prototype.clearVal = function() {
  this.clear$Field(2);
};



/**
 * Message Frame.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Frame = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Frame, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Frame} The cloned message.
 * @override
 */
Frame.prototype.clone;


/**
 * Gets the value of the type field.
 * @return {?Frame.FrameType} The value.
 */
Frame.prototype.getType = function() {
  return /** @type {?Frame.FrameType} */ (this.get$Value(1));
};


/**
 * Gets the value of the type field or the default value if not set.
 * @return {Frame.FrameType} The value.
 */
Frame.prototype.getTypeOrDefault = function() {
  return /** @type {Frame.FrameType} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the type field.
 * @param {Frame.FrameType} value The value.
 */
Frame.prototype.setType = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the type field has a value.
 */
Frame.prototype.hasType = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the type field.
 */
Frame.prototype.typeCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the type field.
 */
Frame.prototype.clearType = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the pos field.
 * @return {?string} The value.
 */
Frame.prototype.getPos = function() {
  return /** @type {?string} */ (this.get$Value(2));
};


/**
 * Gets the value of the pos field or the default value if not set.
 * @return {string} The value.
 */
Frame.prototype.getPosOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the pos field.
 * @param {string} value The value.
 */
Frame.prototype.setPos = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the pos field has a value.
 */
Frame.prototype.hasPos = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the pos field.
 */
Frame.prototype.posCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the pos field.
 */
Frame.prototype.clearPos = function() {
  this.clear$Field(2);
};


/**
 * Gets the value of the opt field.
 * @return {?string} The value.
 */
Frame.prototype.getOpt = function() {
  return /** @type {?string} */ (this.get$Value(3));
};


/**
 * Gets the value of the opt field or the default value if not set.
 * @return {string} The value.
 */
Frame.prototype.getOptOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(3));
};


/**
 * Sets the value of the opt field.
 * @param {string} value The value.
 */
Frame.prototype.setOpt = function(value) {
  this.set$Value(3, value);
};


/**
 * @return {boolean} Whether the opt field has a value.
 */
Frame.prototype.hasOpt = function() {
  return this.has$Value(3);
};


/**
 * @return {number} The number of values in the opt field.
 */
Frame.prototype.optCount = function() {
  return this.count$Values(3);
};


/**
 * Clears the values in the opt field.
 */
Frame.prototype.clearOpt = function() {
  this.clear$Field(3);
};


/**
 * Enumeration FrameType.
 * @enum {number}
 */
Frame.FrameType = {
  POS: 1,
  OPT: 2
};



/**
 * Message Backtrace.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Backtrace = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Backtrace, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Backtrace} The cloned message.
 * @override
 */
Backtrace.prototype.clone;


/**
 * Gets the value of the frames field at the index given.
 * @param {number} index The index to lookup.
 * @return {Frame} The value.
 */
Backtrace.prototype.getFrames = function(index) {
  return /** @type {Frame} */ (this.get$Value(1, index));
};


/**
 * Gets the value of the frames field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Frame} The value.
 */
Backtrace.prototype.getFramesOrDefault = function(index) {
  return /** @type {!Frame} */ (this.get$ValueOrDefault(1, index));
};


/**
 * Adds a value to the frames field.
 * @param {!Frame} value The value to add.
 */
Backtrace.prototype.addFrames = function(value) {
  this.add$Value(1, value);
};


/**
 * Returns the array of values in the frames field.
 * @return {!Array.<!Frame>} The values in the field.
 */
Backtrace.prototype.framesArray = function() {
  return /** @type {!Array.<!Frame>} */ (this.array$Values(1));
};


/**
 * @return {boolean} Whether the frames field has a value.
 */
Backtrace.prototype.hasFrames = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the frames field.
 */
Backtrace.prototype.framesCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the frames field.
 */
Backtrace.prototype.clearFrames = function() {
  this.clear$Field(1);
};

/**
 * Message Response.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Response = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Response, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Response} The cloned message.
 * @override
 */
Response.prototype.clone;


/**
 * Gets the value of the type field.
 * @return {?Response.ResponseType} The value.
 */
Response.prototype.getType = function() {
  return /** @type {?Response.ResponseType} */ (this.get$Value(1));
};


/**
 * Gets the value of the type field or the default value if not set.
 * @return {Response.ResponseType} The value.
 */
Response.prototype.getTypeOrDefault = function() {
  return /** @type {Response.ResponseType} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the type field.
 * @param {Response.ResponseType} value The value.
 */
Response.prototype.setType = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the type field has a value.
 */
Response.prototype.hasType = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the type field.
 */
Response.prototype.typeCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the type field.
 */
Response.prototype.clearType = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the token field.
 * @return {?string} The value.
 */
Response.prototype.getToken = function() {
  return /** @type {?string} */ (this.get$Value(2));
};


/**
 * Gets the value of the token field or the default value if not set.
 * @return {string} The value.
 */
Response.prototype.getTokenOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the token field.
 * @param {string} value The value.
 */
Response.prototype.setToken = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the token field has a value.
 */
Response.prototype.hasToken = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the token field.
 */
Response.prototype.tokenCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the token field.
 */
Response.prototype.clearToken = function() {
  this.clear$Field(2);
};


/**
 * Gets the value of the response field at the index given.
 * @param {number} index The index to lookup.
 * @return {Datum} The value.
 */
Response.prototype.getResponse = function(index) {
  return /** @type {Datum} */ (this.get$Value(3, index));
};


/**
 * Gets the value of the response field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Datum} The value.
 */
Response.prototype.getResponseOrDefault = function(index) {
  return /** @type {!Datum} */ (this.get$ValueOrDefault(3, index));
};


/**
 * Adds a value to the response field.
 * @param {!Datum} value The value to add.
 */
Response.prototype.addResponse = function(value) {
  this.add$Value(3, value);
};


/**
 * Returns the array of values in the response field.
 * @return {!Array.<!Datum>} The values in the field.
 */
Response.prototype.responseArray = function() {
  return /** @type {!Array.<!Datum>} */ (this.array$Values(3));
};


/**
 * @return {boolean} Whether the response field has a value.
 */
Response.prototype.hasResponse = function() {
  return this.has$Value(3);
};


/**
 * @return {number} The number of values in the response field.
 */
Response.prototype.responseCount = function() {
  return this.count$Values(3);
};


/**
 * Clears the values in the response field.
 */
Response.prototype.clearResponse = function() {
  this.clear$Field(3);
};


/**
 * Gets the value of the backtrace field.
 * @return {Backtrace} The value.
 */
Response.prototype.getBacktrace = function() {
  return /** @type {Backtrace} */ (this.get$Value(4));
};


/**
 * Gets the value of the backtrace field or the default value if not set.
 * @return {!Backtrace} The value.
 */
Response.prototype.getBacktraceOrDefault = function() {
  return /** @type {!Backtrace} */ (this.get$ValueOrDefault(4));
};


/**
 * Sets the value of the backtrace field.
 * @param {!Backtrace} value The value.
 */
Response.prototype.setBacktrace = function(value) {
  this.set$Value(4, value);
};


/**
 * @return {boolean} Whether the backtrace field has a value.
 */
Response.prototype.hasBacktrace = function() {
  return this.has$Value(4);
};


/**
 * @return {number} The number of values in the backtrace field.
 */
Response.prototype.backtraceCount = function() {
  return this.count$Values(4);
};


/**
 * Clears the values in the backtrace field.
 */
Response.prototype.clearBacktrace = function() {
  this.clear$Field(4);
};


/**
 * Enumeration ResponseType.
 * @enum {number}
 */
Response.ResponseType = {
  SUCCESS_ATOM: 1,
  SUCCESS_SEQUENCE: 2,
  SUCCESS_PARTIAL: 3,
  CLIENT_ERROR: 16,
  COMPILE_ERROR: 17,
  RUNTIME_ERROR: 18
};



/**
 * Message Datum.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Datum = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Datum, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Datum} The cloned message.
 * @override
 */
Datum.prototype.clone;


/**
 * Gets the value of the type field.
 * @return {?Datum.DatumType} The value.
 */
Datum.prototype.getType = function() {
  return /** @type {?Datum.DatumType} */ (this.get$Value(1));
};


/**
 * Gets the value of the type field or the default value if not set.
 * @return {Datum.DatumType} The value.
 */
Datum.prototype.getTypeOrDefault = function() {
  return /** @type {Datum.DatumType} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the type field.
 * @param {Datum.DatumType} value The value.
 */
Datum.prototype.setType = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the type field has a value.
 */
Datum.prototype.hasType = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the type field.
 */
Datum.prototype.typeCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the type field.
 */
Datum.prototype.clearType = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the r_bool field.
 * @return {?boolean} The value.
 */
Datum.prototype.getRBool = function() {
  return /** @type {?boolean} */ (this.get$Value(2));
};


/**
 * Gets the value of the r_bool field or the default value if not set.
 * @return {boolean} The value.
 */
Datum.prototype.getRBoolOrDefault = function() {
  return /** @type {boolean} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the r_bool field.
 * @param {boolean} value The value.
 */
Datum.prototype.setRBool = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the r_bool field has a value.
 */
Datum.prototype.hasRBool = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the r_bool field.
 */
Datum.prototype.rBoolCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the r_bool field.
 */
Datum.prototype.clearRBool = function() {
  this.clear$Field(2);
};


/**
 * Gets the value of the r_num field.
 * @return {?number} The value.
 */
Datum.prototype.getRNum = function() {
  return /** @type {?number} */ (this.get$Value(3));
};


/**
 * Gets the value of the r_num field or the default value if not set.
 * @return {number} The value.
 */
Datum.prototype.getRNumOrDefault = function() {
  return /** @type {number} */ (this.get$ValueOrDefault(3));
};


/**
 * Sets the value of the r_num field.
 * @param {number} value The value.
 */
Datum.prototype.setRNum = function(value) {
  this.set$Value(3, value);
};


/**
 * @return {boolean} Whether the r_num field has a value.
 */
Datum.prototype.hasRNum = function() {
  return this.has$Value(3);
};


/**
 * @return {number} The number of values in the r_num field.
 */
Datum.prototype.rNumCount = function() {
  return this.count$Values(3);
};


/**
 * Clears the values in the r_num field.
 */
Datum.prototype.clearRNum = function() {
  this.clear$Field(3);
};


/**
 * Gets the value of the r_str field.
 * @return {?string} The value.
 */
Datum.prototype.getRStr = function() {
  return /** @type {?string} */ (this.get$Value(4));
};


/**
 * Gets the value of the r_str field or the default value if not set.
 * @return {string} The value.
 */
Datum.prototype.getRStrOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(4));
};


/**
 * Sets the value of the r_str field.
 * @param {string} value The value.
 */
Datum.prototype.setRStr = function(value) {
  this.set$Value(4, value);
};


/**
 * @return {boolean} Whether the r_str field has a value.
 */
Datum.prototype.hasRStr = function() {
  return this.has$Value(4);
};


/**
 * @return {number} The number of values in the r_str field.
 */
Datum.prototype.rStrCount = function() {
  return this.count$Values(4);
};


/**
 * Clears the values in the r_str field.
 */
Datum.prototype.clearRStr = function() {
  this.clear$Field(4);
};


/**
 * Gets the value of the r_array field at the index given.
 * @param {number} index The index to lookup.
 * @return {Datum} The value.
 */
Datum.prototype.getRArray = function(index) {
  return /** @type {Datum} */ (this.get$Value(5, index));
};


/**
 * Gets the value of the r_array field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Datum} The value.
 */
Datum.prototype.getRArrayOrDefault = function(index) {
  return /** @type {!Datum} */ (this.get$ValueOrDefault(5, index));
};


/**
 * Adds a value to the r_array field.
 * @param {!Datum} value The value to add.
 */
Datum.prototype.addRArray = function(value) {
  this.add$Value(5, value);
};


/**
 * Returns the array of values in the r_array field.
 * @return {!Array.<!Datum>} The values in the field.
 */
Datum.prototype.rArrayArray = function() {
  return /** @type {!Array.<!Datum>} */ (this.array$Values(5));
};


/**
 * @return {boolean} Whether the r_array field has a value.
 */
Datum.prototype.hasRArray = function() {
  return this.has$Value(5);
};


/**
 * @return {number} The number of values in the r_array field.
 */
Datum.prototype.rArrayCount = function() {
  return this.count$Values(5);
};


/**
 * Clears the values in the r_array field.
 */
Datum.prototype.clearRArray = function() {
  this.clear$Field(5);
};


/**
 * Gets the value of the r_object field at the index given.
 * @param {number} index The index to lookup.
 * @return {Datum.AssocPair} The value.
 */
Datum.prototype.getRObject = function(index) {
  return /** @type {Datum.AssocPair} */ (this.get$Value(6, index));
};


/**
 * Gets the value of the r_object field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Datum.AssocPair} The value.
 */
Datum.prototype.getRObjectOrDefault = function(index) {
  return /** @type {!Datum.AssocPair} */ (this.get$ValueOrDefault(6, index));
};


/**
 * Adds a value to the r_object field.
 * @param {!Datum.AssocPair} value The value to add.
 */
Datum.prototype.addRObject = function(value) {
  this.add$Value(6, value);
};


/**
 * Returns the array of values in the r_object field.
 * @return {!Array.<!Datum.AssocPair>} The values in the field.
 */
Datum.prototype.rObjectArray = function() {
  return /** @type {!Array.<!Datum.AssocPair>} */ (this.array$Values(6));
};


/**
 * @return {boolean} Whether the r_object field has a value.
 */
Datum.prototype.hasRObject = function() {
  return this.has$Value(6);
};


/**
 * @return {number} The number of values in the r_object field.
 */
Datum.prototype.rObjectCount = function() {
  return this.count$Values(6);
};


/**
 * Clears the values in the r_object field.
 */
Datum.prototype.clearRObject = function() {
  this.clear$Field(6);
};


/**
 * Enumeration DatumType.
 * @enum {number}
 */
Datum.DatumType = {
  R_NULL: 1,
  R_BOOL: 2,
  R_NUM: 3,
  R_STR: 4,
  R_ARRAY: 5,
  R_OBJECT: 6
};



/**
 * Message AssocPair.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Datum.AssocPair = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Datum.AssocPair, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Datum.AssocPair} The cloned message.
 * @override
 */
Datum.AssocPair.prototype.clone;


/**
 * Gets the value of the key field.
 * @return {?string} The value.
 */
Datum.AssocPair.prototype.getKey = function() {
  return /** @type {?string} */ (this.get$Value(1));
};


/**
 * Gets the value of the key field or the default value if not set.
 * @return {string} The value.
 */
Datum.AssocPair.prototype.getKeyOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the key field.
 * @param {string} value The value.
 */
Datum.AssocPair.prototype.setKey = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the key field has a value.
 */
Datum.AssocPair.prototype.hasKey = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the key field.
 */
Datum.AssocPair.prototype.keyCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the key field.
 */
Datum.AssocPair.prototype.clearKey = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the val field.
 * @return {Datum} The value.
 */
Datum.AssocPair.prototype.getVal = function() {
  return /** @type {Datum} */ (this.get$Value(2));
};


/**
 * Gets the value of the val field or the default value if not set.
 * @return {!Datum} The value.
 */
Datum.AssocPair.prototype.getValOrDefault = function() {
  return /** @type {!Datum} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the val field.
 * @param {!Datum} value The value.
 */
Datum.AssocPair.prototype.setVal = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the val field has a value.
 */
Datum.AssocPair.prototype.hasVal = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the val field.
 */
Datum.AssocPair.prototype.valCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the val field.
 */
Datum.AssocPair.prototype.clearVal = function() {
  this.clear$Field(2);
};



/**
 * Message Term.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Term = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Term, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Term} The cloned message.
 * @override
 */
Term.prototype.clone;


/**
 * Gets the value of the type field.
 * @return {?Term.TermType} The value.
 */
Term.prototype.getType = function() {
  return /** @type {?Term.TermType} */ (this.get$Value(1));
};


/**
 * Gets the value of the type field or the default value if not set.
 * @return {Term.TermType} The value.
 */
Term.prototype.getTypeOrDefault = function() {
  return /** @type {Term.TermType} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the type field.
 * @param {Term.TermType} value The value.
 */
Term.prototype.setType = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the type field has a value.
 */
Term.prototype.hasType = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the type field.
 */
Term.prototype.typeCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the type field.
 */
Term.prototype.clearType = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the datum field.
 * @return {Datum} The value.
 */
Term.prototype.getDatum = function() {
  return /** @type {Datum} */ (this.get$Value(2));
};


/**
 * Gets the value of the datum field or the default value if not set.
 * @return {!Datum} The value.
 */
Term.prototype.getDatumOrDefault = function() {
  return /** @type {!Datum} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the datum field.
 * @param {!Datum} value The value.
 */
Term.prototype.setDatum = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the datum field has a value.
 */
Term.prototype.hasDatum = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the datum field.
 */
Term.prototype.datumCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the datum field.
 */
Term.prototype.clearDatum = function() {
  this.clear$Field(2);
};


/**
 * Gets the value of the args field at the index given.
 * @param {number} index The index to lookup.
 * @return {Term} The value.
 */
Term.prototype.getArgs = function(index) {
  return /** @type {Term} */ (this.get$Value(3, index));
};


/**
 * Gets the value of the args field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Term} The value.
 */
Term.prototype.getArgsOrDefault = function(index) {
  return /** @type {!Term} */ (this.get$ValueOrDefault(3, index));
};


/**
 * Adds a value to the args field.
 * @param {!Term} value The value to add.
 */
Term.prototype.addArgs = function(value) {
  this.add$Value(3, value);
};


/**
 * Returns the array of values in the args field.
 * @return {!Array.<!Term>} The values in the field.
 */
Term.prototype.argsArray = function() {
  return /** @type {!Array.<!Term>} */ (this.array$Values(3));
};


/**
 * @return {boolean} Whether the args field has a value.
 */
Term.prototype.hasArgs = function() {
  return this.has$Value(3);
};


/**
 * @return {number} The number of values in the args field.
 */
Term.prototype.argsCount = function() {
  return this.count$Values(3);
};


/**
 * Clears the values in the args field.
 */
Term.prototype.clearArgs = function() {
  this.clear$Field(3);
};


/**
 * Gets the value of the optargs field at the index given.
 * @param {number} index The index to lookup.
 * @return {Term.AssocPair} The value.
 */
Term.prototype.getOptargs = function(index) {
  return /** @type {Term.AssocPair} */ (this.get$Value(4, index));
};


/**
 * Gets the value of the optargs field at the index given or the default value if not set.
 * @param {number} index The index to lookup.
 * @return {!Term.AssocPair} The value.
 */
Term.prototype.getOptargsOrDefault = function(index) {
  return /** @type {!Term.AssocPair} */ (this.get$ValueOrDefault(4, index));
};


/**
 * Adds a value to the optargs field.
 * @param {!Term.AssocPair} value The value to add.
 */
Term.prototype.addOptargs = function(value) {
  this.add$Value(4, value);
};


/**
 * Returns the array of values in the optargs field.
 * @return {!Array.<!Term.AssocPair>} The values in the field.
 */
Term.prototype.optargsArray = function() {
  return /** @type {!Array.<!Term.AssocPair>} */ (this.array$Values(4));
};


/**
 * @return {boolean} Whether the optargs field has a value.
 */
Term.prototype.hasOptargs = function() {
  return this.has$Value(4);
};


/**
 * @return {number} The number of values in the optargs field.
 */
Term.prototype.optargsCount = function() {
  return this.count$Values(4);
};


/**
 * Clears the values in the optargs field.
 */
Term.prototype.clearOptargs = function() {
  this.clear$Field(4);
};


/**
 * Enumeration TermType.
 * @enum {number}
 */
Term.TermType = {
  DATUM: 1,
  MAKE_ARRAY: 2,
  MAKE_OBJ: 3,
  VAR: 10,
  JAVASCRIPT: 11,
  ERROR: 12,
  IMPLICIT_VAR: 13,
  DB: 14,
  TABLE: 15,
  GET: 16,
  GET_ALL: 78,
  EQ: 17,
  NE: 18,
  LT: 19,
  LE: 20,
  GT: 21,
  GE: 22,
  NOT: 23,
  ADD: 24,
  SUB: 25,
  MUL: 26,
  DIV: 27,
  MOD: 28,
  APPEND: 29,
  SLICE: 30,
  SKIP: 70,
  LIMIT: 71,
  GETATTR: 31,
  CONTAINS: 32,
  PLUCK: 33,
  WITHOUT: 34,
  MERGE: 35,
  BETWEEN: 36,
  REDUCE: 37,
  MAP: 38,
  FILTER: 39,
  CONCATMAP: 40,
  ORDERBY: 41,
  DISTINCT: 42,
  COUNT: 43,
  UNION: 44,
  NTH: 45,
  GROUPED_MAP_REDUCE: 46,
  GROUPBY: 47,
  INNER_JOIN: 48,
  OUTER_JOIN: 49,
  EQ_JOIN: 50,
  ZIP: 72,
  COERCE_TO: 51,
  TYPEOF: 52,
  UPDATE: 53,
  DELETE: 54,
  REPLACE: 55,
  INSERT: 56,
  DB_CREATE: 57,
  DB_DROP: 58,
  DB_LIST: 59,
  TABLE_CREATE: 60,
  TABLE_DROP: 61,
  TABLE_LIST: 62,
  INDEX_CREATE: 75,
  INDEX_DROP: 76,
  INDEX_LIST: 77,
  FUNCALL: 64,
  BRANCH: 65,
  ANY: 66,
  ALL: 67,
  FOREACH: 68,
  FUNC: 69,
  ASC: 73,
  DESC: 74,
  INFO: 79
};



/**
 * Message AssocPair.
 * @constructor
 * @extends {goog.proto2.Message}
 */
Term.AssocPair = function() {
  goog.proto2.Message.apply(this);
};
goog.inherits(Term.AssocPair, goog.proto2.Message);


/**
 * Overrides {@link goog.proto2.Message#clone} to specify its exact return type.
 * @return {!Term.AssocPair} The cloned message.
 * @override
 */
Term.AssocPair.prototype.clone;


/**
 * Gets the value of the key field.
 * @return {?string} The value.
 */
Term.AssocPair.prototype.getKey = function() {
  return /** @type {?string} */ (this.get$Value(1));
};


/**
 * Gets the value of the key field or the default value if not set.
 * @return {string} The value.
 */
Term.AssocPair.prototype.getKeyOrDefault = function() {
  return /** @type {string} */ (this.get$ValueOrDefault(1));
};


/**
 * Sets the value of the key field.
 * @param {string} value The value.
 */
Term.AssocPair.prototype.setKey = function(value) {
  this.set$Value(1, value);
};


/**
 * @return {boolean} Whether the key field has a value.
 */
Term.AssocPair.prototype.hasKey = function() {
  return this.has$Value(1);
};


/**
 * @return {number} The number of values in the key field.
 */
Term.AssocPair.prototype.keyCount = function() {
  return this.count$Values(1);
};


/**
 * Clears the values in the key field.
 */
Term.AssocPair.prototype.clearKey = function() {
  this.clear$Field(1);
};


/**
 * Gets the value of the val field.
 * @return {Term} The value.
 */
Term.AssocPair.prototype.getVal = function() {
  return /** @type {Term} */ (this.get$Value(2));
};


/**
 * Gets the value of the val field or the default value if not set.
 * @return {!Term} The value.
 */
Term.AssocPair.prototype.getValOrDefault = function() {
  return /** @type {!Term} */ (this.get$ValueOrDefault(2));
};


/**
 * Sets the value of the val field.
 * @param {!Term} value The value.
 */
Term.AssocPair.prototype.setVal = function(value) {
  this.set$Value(2, value);
};


/**
 * @return {boolean} Whether the val field has a value.
 */
Term.AssocPair.prototype.hasVal = function() {
  return this.has$Value(2);
};


/**
 * @return {number} The number of values in the val field.
 */
Term.AssocPair.prototype.valCount = function() {
  return this.count$Values(2);
};


/**
 * Clears the values in the val field.
 */
Term.AssocPair.prototype.clearVal = function() {
  this.clear$Field(2);
};





goog.proto2.Message.set$Metadata(VersionDummy, {
  0: {
    name: 'VersionDummy',
    fullName: 'VersionDummy'
  }
});


goog.proto2.Message.set$Metadata(Query, {
  0: {
    name: 'Query',
    fullName: 'Query'
  },
  1: {
    name: 'type',
    fieldType: goog.proto2.Message.FieldType.ENUM,
    defaultValue: Query.QueryType.START,
    type: Query.QueryType
  },
  2: {
    name: 'query',
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Term
  },
  3: {
    name: 'token',
    fieldType: goog.proto2.Message.FieldType.INT64,
    type: String
  },
  4: {
    name: 'OBSOLETE_noreply',
    fieldType: goog.proto2.Message.FieldType.BOOL,
    defaultValue: 0,
    type: Boolean
  },
  6: {
    name: 'global_optargs',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Query.AssocPair
  }
});


goog.proto2.Message.set$Metadata(Query.AssocPair, {
  0: {
    name: 'AssocPair',
    containingType: Query,
    fullName: 'Query.AssocPair'
  },
  1: {
    name: 'key',
    fieldType: goog.proto2.Message.FieldType.STRING,
    type: String
  },
  2: {
    name: 'val',
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Term
  }
});


goog.proto2.Message.set$Metadata(Frame, {
  0: {
    name: 'Frame',
    fullName: 'Frame'
  },
  1: {
    name: 'type',
    fieldType: goog.proto2.Message.FieldType.ENUM,
    defaultValue: Frame.FrameType.POS,
    type: Frame.FrameType
  },
  2: {
    name: 'pos',
    fieldType: goog.proto2.Message.FieldType.INT64,
    type: String
  },
  3: {
    name: 'opt',
    fieldType: goog.proto2.Message.FieldType.STRING,
    type: String
  }
});


goog.proto2.Message.set$Metadata(Backtrace, {
  0: {
    name: 'Backtrace',
    fullName: 'Backtrace'
  },
  1: {
    name: 'frames',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Frame
  }
});


goog.proto2.Message.set$Metadata(Response, {
  0: {
    name: 'Response',
    fullName: 'Response'
  },
  1: {
    name: 'type',
    fieldType: goog.proto2.Message.FieldType.ENUM,
    defaultValue: Response.ResponseType.SUCCESS_ATOM,
    type: Response.ResponseType
  },
  2: {
    name: 'token',
    fieldType: goog.proto2.Message.FieldType.INT64,
    type: String
  },
  3: {
    name: 'response',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Datum
  },
  4: {
    name: 'backtrace',
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Backtrace
  }
});


goog.proto2.Message.set$Metadata(Datum, {
  0: {
    name: 'Datum',
    fullName: 'Datum'
  },
  1: {
    name: 'type',
    fieldType: goog.proto2.Message.FieldType.ENUM,
    defaultValue: Datum.DatumType.R_NULL,
    type: Datum.DatumType
  },
  2: {
    name: 'r_bool',
    fieldType: goog.proto2.Message.FieldType.BOOL,
    type: Boolean
  },
  3: {
    name: 'r_num',
    fieldType: goog.proto2.Message.FieldType.DOUBLE,
    type: Number
  },
  4: {
    name: 'r_str',
    fieldType: goog.proto2.Message.FieldType.STRING,
    type: String
  },
  5: {
    name: 'r_array',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Datum
  },
  6: {
    name: 'r_object',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Datum.AssocPair
  }
});


goog.proto2.Message.set$Metadata(Datum.AssocPair, {
  0: {
    name: 'AssocPair',
    containingType: Datum,
    fullName: 'Datum.AssocPair'
  },
  1: {
    name: 'key',
    fieldType: goog.proto2.Message.FieldType.STRING,
    type: String
  },
  2: {
    name: 'val',
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Datum
  }
});


goog.proto2.Message.set$Metadata(Term, {
  0: {
    name: 'Term',
    fullName: 'Term'
  },
  1: {
    name: 'type',
    fieldType: goog.proto2.Message.FieldType.ENUM,
    defaultValue: Term.TermType.DATUM,
    type: Term.TermType
  },
  2: {
    name: 'datum',
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Datum
  },
  3: {
    name: 'args',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Term
  },
  4: {
    name: 'optargs',
    repeated: true,
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Term.AssocPair
  }
});


goog.proto2.Message.set$Metadata(Term.AssocPair, {
  0: {
    name: 'AssocPair',
    containingType: Term,
    fullName: 'Term.AssocPair'
  },
  1: {
    name: 'key',
    fieldType: goog.proto2.Message.FieldType.STRING,
    type: String
  },
  2: {
    name: 'val',
    fieldType: goog.proto2.Message.FieldType.MESSAGE,
    type: Term
  }
});
// Generated by CoffeeScript 1.6.2
var Add, All, Any, Append, Asc, Between, Branch, CoerceTo, ConcatMap, Contains, Count, DatumTerm, Db, DbCreate, DbDrop, DbList, Delete, Desc, Distinct, Div, Eq, EqJoin, Filter, ForEach, FunCall, Func, Ge, Get, GetAll, GetAttr, GroupBy, GroupedMapReduce, Gt, ImplicitVar, IndexCreate, IndexDrop, IndexList, Info, InnerJoin, Insert, JavaScript, Le, Limit, Lt, MakeArray, MakeObject, Map, Merge, Mod, Mul, Ne, Not, Nth, OrderBy, OuterJoin, Pluck, RDBOp, RDBVal, Reduce, Replace, Skip, Slice, Sub, Table, TableCreate, TableDrop, TableList, TermBase, TypeOf, Union, Update, UserError, Var, Without, Zip, funcWrap, intsp, intspallargs, kved, shouldWrap, translateOptargs, _ref, _ref1, _ref10, _ref11, _ref12, _ref13, _ref14, _ref15, _ref16, _ref17, _ref18, _ref19, _ref2, _ref20, _ref21, _ref22, _ref23, _ref24, _ref25, _ref26, _ref27, _ref28, _ref29, _ref3, _ref30, _ref31, _ref32, _ref33, _ref34, _ref35, _ref36, _ref37, _ref38, _ref39, _ref4, _ref40, _ref41, _ref42, _ref43, _ref44, _ref45, _ref46, _ref47, _ref48, _ref49, _ref5, _ref50, _ref51, _ref52, _ref53, _ref54, _ref55, _ref56, _ref57, _ref58, _ref59, _ref6, _ref60, _ref61, _ref62, _ref63, _ref64, _ref65, _ref66, _ref67, _ref68, _ref69, _ref7, _ref70, _ref8, _ref9,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice;

goog.provide("rethinkdb.ast");

goog.require("rethinkdb.base");

goog.require("rethinkdb.errors");

goog.require("Term");

goog.require("Datum");

TermBase = (function() {
  function TermBase() {
    var self;

    self = (function(field) {
      return self.getAttr(field);
    });
    self.__proto__ = this.__proto__;
    return self;
  }

  TermBase.prototype.run = function(conn, cb) {
    var key, noreply, useOutdated;

    useOutdated = void 0;
    if ((conn != null) && typeof conn === 'object' && !(conn instanceof Connection)) {
      useOutdated = !!conn.useOutdated;
      noreply = !!conn.noreply;
      for (key in conn) {
        if (!__hasProp.call(conn, key)) continue;
        if (key !== 'connection' && key !== 'useOutdated' && key !== 'noreply') {
          throw new RqlDriverError("First argument to `run` must be an open connection or { connection: <connection>, useOutdated: <bool>, noreply: <bool>}.");
        }
      }
      conn = conn.connection;
    }
    if (!(conn instanceof Connection)) {
      throw new RqlDriverError("First argument to `run` must be an open connection or { connection: <connection>, useOutdated: <bool> }.");
    }
    if (typeof cb !== 'function') {
      throw new RqlDriverError("Second argument to `run` must be a callback to invoke " + "with either an error or the result of the query.");
    }
    return conn._start(this, cb, useOutdated, noreply);
  };

  TermBase.prototype.toString = function() {
    return RqlQueryPrinter.prototype.printQuery(this);
  };

  return TermBase;

})();

RDBVal = (function(_super) {
  __extends(RDBVal, _super);

  function RDBVal() {
    _ref = RDBVal.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  RDBVal.prototype.eq = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Eq, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.ne = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Ne, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.lt = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Lt, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.le = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Le, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.gt = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Gt, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.ge = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Ge, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.not = ar(function() {
    return new Not({}, this);
  });

  RDBVal.prototype.add = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Add, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.sub = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Sub, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.mul = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Mul, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.div = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Div, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.mod = ar(function(other) {
    return new Mod({}, this, other);
  });

  RDBVal.prototype.append = ar(function(val) {
    return new Append({}, this, val);
  });

  RDBVal.prototype.slice = ar(function(left, right) {
    return new Slice({}, this, left, right);
  });

  RDBVal.prototype.skip = ar(function(index) {
    return new Skip({}, this, index);
  });

  RDBVal.prototype.limit = ar(function(index) {
    return new Limit({}, this, index);
  });

  RDBVal.prototype.getAttr = ar(function(field) {
    return new GetAttr({}, this, field);
  });

  RDBVal.prototype.contains = varar(1, null, function() {
    var fields;

    fields = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Contains, [{}, this].concat(__slice.call(fields)), function(){});
  });

  RDBVal.prototype.pluck = function() {
    var fields;

    fields = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Pluck, [{}, this].concat(__slice.call(fields)), function(){});
  };

  RDBVal.prototype.without = function() {
    var fields;

    fields = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Without, [{}, this].concat(__slice.call(fields)), function(){});
  };

  RDBVal.prototype.merge = ar(function(other) {
    return new Merge({}, this, other);
  });

  RDBVal.prototype.between = aropt(function(left, right, opts) {
    return new Between(opts, this, left, right);
  });

  RDBVal.prototype.reduce = aropt(function(func, base) {
    return new Reduce({
      base: base
    }, this, funcWrap(func));
  });

  RDBVal.prototype.map = ar(function(func) {
    return new Map({}, this, funcWrap(func));
  });

  RDBVal.prototype.filter = ar(function(predicate) {
    return new Filter({}, this, funcWrap(predicate));
  });

  RDBVal.prototype.concatMap = ar(function(func) {
    return new ConcatMap({}, this, funcWrap(func));
  });

  RDBVal.prototype.orderBy = varar(1, null, function() {
    var fields;

    fields = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(OrderBy, [{}, this].concat(__slice.call(fields)), function(){});
  });

  RDBVal.prototype.distinct = ar(function() {
    return new Distinct({}, this);
  });

  RDBVal.prototype.count = ar(function() {
    return new Count({}, this);
  });

  RDBVal.prototype.union = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Union, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.nth = ar(function(index) {
    return new Nth({}, this, index);
  });

  RDBVal.prototype.groupedMapReduce = aropt(function(group, map, reduce, base) {
    return new GroupedMapReduce({
      base: base
    }, this, funcWrap(group), funcWrap(map), funcWrap(reduce));
  });

  RDBVal.prototype.innerJoin = ar(function(other, predicate) {
    return new InnerJoin({}, this, other, predicate);
  });

  RDBVal.prototype.outerJoin = ar(function(other, predicate) {
    return new OuterJoin({}, this, other, predicate);
  });

  RDBVal.prototype.eqJoin = aropt(function(left_attr, right, opts) {
    return new EqJoin(opts, this, left_attr, right);
  });

  RDBVal.prototype.zip = ar(function() {
    return new Zip({}, this);
  });

  RDBVal.prototype.coerceTo = ar(function(type) {
    return new CoerceTo({}, this, type);
  });

  RDBVal.prototype.typeOf = ar(function() {
    return new TypeOf({}, this);
  });

  RDBVal.prototype.update = aropt(function(func, opts) {
    return new Update(opts, this, funcWrap(func));
  });

  RDBVal.prototype["delete"] = ar(function() {
    return new Delete({}, this);
  });

  RDBVal.prototype.replace = aropt(function(func, opts) {
    return new Replace(opts, this, funcWrap(func));
  });

  RDBVal.prototype["do"] = ar(function(func) {
    return new FunCall({}, funcWrap(func), this);
  });

  RDBVal.prototype.or = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(Any, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.and = varar(1, null, function() {
    var others;

    others = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(All, [{}, this].concat(__slice.call(others)), function(){});
  });

  RDBVal.prototype.forEach = ar(function(func) {
    return new ForEach({}, this, funcWrap(func));
  });

  RDBVal.prototype.groupBy = function() {
    var attrs, collector, numArgs, _i;

    attrs = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), collector = arguments[_i++];
    if (!((collector != null) && attrs.length >= 1)) {
      numArgs = attrs.length + (collector != null ? 1 : 0);
      throw new RqlDriverError("Expected 2 or more argument(s) but found " + numArgs + ".");
    }
    return new GroupBy({}, this, attrs, collector);
  };

  RDBVal.prototype.info = ar(function() {
    return new Info({}, this);
  });

  return RDBVal;

})(TermBase);

DatumTerm = (function(_super) {
  __extends(DatumTerm, _super);

  DatumTerm.prototype.args = [];

  DatumTerm.prototype.optargs = {};

  function DatumTerm(val) {
    var self;

    self = DatumTerm.__super__.constructor.call(this);
    self.data = val;
    return self;
  }

  DatumTerm.prototype.compose = function() {
    switch (typeof this.data) {
      case 'string':
        return '"' + this.data + '"';
      default:
        return '' + this.data;
    }
  };

  DatumTerm.prototype.build = function() {
    var datum, term;

    datum = new Datum;
    if (this.data === null) {
      datum.setType(Datum.DatumType.R_NULL);
    } else {
      switch (typeof this.data) {
        case 'number':
          datum.setType(Datum.DatumType.R_NUM);
          datum.setRNum(this.data);
          break;
        case 'boolean':
          datum.setType(Datum.DatumType.R_BOOL);
          datum.setRBool(this.data);
          break;
        case 'string':
          datum.setType(Datum.DatumType.R_STR);
          datum.setRStr(this.data);
          break;
        default:
          throw new RqlDriverError("Unknown datum value `" + this.data + "`, did you forget a `return`?");
      }
    }
    term = new Term;
    term.setType(Term.TermType.DATUM);
    term.setDatum(datum);
    return term;
  };

  DatumTerm.prototype.deconstruct = function(datum) {
    var dt, obj, pair, _i, _j, _len, _len1, _ref1, _ref2, _results;

    switch (datum.getType()) {
      case Datum.DatumType.R_NULL:
        return null;
      case Datum.DatumType.R_BOOL:
        return datum.getRBool();
      case Datum.DatumType.R_NUM:
        return datum.getRNum();
      case Datum.DatumType.R_STR:
        return datum.getRStr();
      case Datum.DatumType.R_ARRAY:
        _ref1 = datum.rArrayArray();
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          dt = _ref1[_i];
          _results.push(DatumTerm.prototype.deconstruct(dt));
        }
        return _results;
        break;
      case Datum.DatumType.R_OBJECT:
        obj = {};
        _ref2 = datum.rObjectArray();
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          pair = _ref2[_j];
          obj[pair.getKey()] = DatumTerm.prototype.deconstruct(pair.getVal());
        }
        return obj;
    }
  };

  return DatumTerm;

})(RDBVal);

translateOptargs = function(optargs) {
  var key, result, val;

  result = {};
  for (key in optargs) {
    if (!__hasProp.call(optargs, key)) continue;
    val = optargs[key];
    key = (function() {
      switch (key) {
        case 'primaryKey':
          return 'primary_key';
        case 'useOutdated':
          return 'use_outdated';
        case 'nonAtomic':
          return 'non_atomic';
        case 'cacheSize':
          return 'cache_size';
        case 'hardDurability':
          return 'hard_durability';
        default:
          return key;
      }
    })();
    if (key === void 0 || val === void 0) {
      continue;
    }
    result[key] = rethinkdb.expr(val);
  }
  return result;
};

RDBOp = (function(_super) {
  __extends(RDBOp, _super);

  function RDBOp() {
    var arg, args, optargs, self;

    optargs = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    self = RDBOp.__super__.constructor.call(this);
    self.args = (function() {
      var _i, _len, _results;

      _results = [];
      for (_i = 0, _len = args.length; _i < _len; _i++) {
        arg = args[_i];
        _results.push(rethinkdb.expr(arg));
      }
      return _results;
    })();
    self.optargs = translateOptargs(optargs);
    return self;
  }

  RDBOp.prototype.build = function() {
    var arg, key, pair, term, val, _i, _len, _ref1, _ref2;

    term = new Term;
    term.setType(this.tt);
    _ref1 = this.args;
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      arg = _ref1[_i];
      term.addArgs(arg.build());
    }
    _ref2 = this.optargs;
    for (key in _ref2) {
      if (!__hasProp.call(_ref2, key)) continue;
      val = _ref2[key];
      pair = new Term.AssocPair;
      pair.setKey(key);
      pair.setVal(val.build());
      term.addOptargs(pair);
    }
    return term;
  };

  RDBOp.prototype.compose = function(args, optargs) {
    if (this.st) {
      return ['r.', this.st, '(', intspallargs(args, optargs), ')'];
    } else {
      if (shouldWrap(this.args[0])) {
        args[0] = ['r(', args[0], ')'];
      }
      return [args[0], '.', this.mt, '(', intspallargs(args.slice(1), optargs), ')'];
    }
  };

  return RDBOp;

})(RDBVal);

intsp = function(seq) {
  var e, res, _i, _len, _ref1;

  if (seq[0] == null) {
    return [];
  }
  res = [seq[0]];
  _ref1 = seq.slice(1);
  for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
    e = _ref1[_i];
    res.push(', ', e);
  }
  return res;
};

kved = function(optargs) {
  var k, v;

  return [
    '{', intsp((function() {
      var _results;

      _results = [];
      for (k in optargs) {
        if (!__hasProp.call(optargs, k)) continue;
        v = optargs[k];
        _results.push([k, ': ', v]);
      }
      return _results;
    })()), '}'
  ];
};

intspallargs = function(args, optargs) {
  var argrepr;

  argrepr = [];
  if (args.length > 0) {
    argrepr.push(intsp(args));
  }
  if (Object.keys(optargs).length > 0) {
    if (argrepr.length > 0) {
      argrepr.push(', ');
    }
    argrepr.push(kved(optargs));
  }
  return argrepr;
};

shouldWrap = function(arg) {
  return arg instanceof DatumTerm || arg instanceof MakeArray || arg instanceof MakeObject;
};

MakeArray = (function(_super) {
  __extends(MakeArray, _super);

  function MakeArray() {
    _ref1 = MakeArray.__super__.constructor.apply(this, arguments);
    return _ref1;
  }

  MakeArray.prototype.tt = Term.TermType.MAKE_ARRAY;

  MakeArray.prototype.compose = function(args) {
    return ['[', intsp(args), ']'];
  };

  return MakeArray;

})(RDBOp);

MakeObject = (function(_super) {
  __extends(MakeObject, _super);

  MakeObject.prototype.tt = Term.TermType.MAKE_OBJ;

  function MakeObject(obj) {
    var key, self, val;

    self = MakeObject.__super__.constructor.call(this, {});
    self.optargs = {};
    for (key in obj) {
      if (!__hasProp.call(obj, key)) continue;
      val = obj[key];
      if (typeof val === 'undefined') {
        throw new RqlDriverError("Object field '" + key + "' may not be undefined");
      }
      self.optargs[key] = rethinkdb.expr(val);
    }
    return self;
  }

  MakeObject.prototype.compose = function(args, optargs) {
    return kved(optargs);
  };

  return MakeObject;

})(RDBOp);

Var = (function(_super) {
  __extends(Var, _super);

  function Var() {
    _ref2 = Var.__super__.constructor.apply(this, arguments);
    return _ref2;
  }

  Var.prototype.tt = Term.TermType.VAR;

  Var.prototype.compose = function(args) {
    return ['var_' + args[0]];
  };

  return Var;

})(RDBOp);

JavaScript = (function(_super) {
  __extends(JavaScript, _super);

  function JavaScript() {
    _ref3 = JavaScript.__super__.constructor.apply(this, arguments);
    return _ref3;
  }

  JavaScript.prototype.tt = Term.TermType.JAVASCRIPT;

  JavaScript.prototype.st = 'js';

  return JavaScript;

})(RDBOp);

UserError = (function(_super) {
  __extends(UserError, _super);

  function UserError() {
    _ref4 = UserError.__super__.constructor.apply(this, arguments);
    return _ref4;
  }

  UserError.prototype.tt = Term.TermType.ERROR;

  UserError.prototype.st = 'error';

  return UserError;

})(RDBOp);

ImplicitVar = (function(_super) {
  __extends(ImplicitVar, _super);

  function ImplicitVar() {
    _ref5 = ImplicitVar.__super__.constructor.apply(this, arguments);
    return _ref5;
  }

  ImplicitVar.prototype.tt = Term.TermType.IMPLICIT_VAR;

  ImplicitVar.prototype.compose = function() {
    return ['r.row'];
  };

  return ImplicitVar;

})(RDBOp);

Db = (function(_super) {
  __extends(Db, _super);

  function Db() {
    _ref6 = Db.__super__.constructor.apply(this, arguments);
    return _ref6;
  }

  Db.prototype.tt = Term.TermType.DB;

  Db.prototype.st = 'db';

  Db.prototype.tableCreate = aropt(function(tblName, opts) {
    return new TableCreate(opts, this, tblName);
  });

  Db.prototype.tableDrop = ar(function(tblName) {
    return new TableDrop({}, this, tblName);
  });

  Db.prototype.tableList = ar(function() {
    return new TableList({}, this);
  });

  Db.prototype.table = aropt(function(tblName, opts) {
    return new Table(opts, this, tblName);
  });

  return Db;

})(RDBOp);

Table = (function(_super) {
  __extends(Table, _super);

  function Table() {
    _ref7 = Table.__super__.constructor.apply(this, arguments);
    return _ref7;
  }

  Table.prototype.tt = Term.TermType.TABLE;

  Table.prototype.get = ar(function(key) {
    return new Get({}, this, key);
  });

  Table.prototype.getAll = aropt(function(key, opts) {
    return new GetAll(opts, this, key);
  });

  Table.prototype.insert = aropt(function(doc, opts) {
    return new Insert(opts, this, doc);
  });

  Table.prototype.indexCreate = varar(1, 2, function(name, defun) {
    if (defun != null) {
      return new IndexCreate({}, this, name, funcWrap(defun));
    } else {
      return new IndexCreate({}, this, name);
    }
  });

  Table.prototype.indexDrop = ar(function(name) {
    return new IndexDrop({}, this, name);
  });

  Table.prototype.indexList = ar(function() {
    return new IndexList({}, this);
  });

  Table.prototype.compose = function(args, optargs) {
    if (this.args[0] instanceof Db) {
      return [args[0], '.table(', args[1], ')'];
    } else {
      return ['r.table(', args[0], ')'];
    }
  };

  return Table;

})(RDBOp);

Get = (function(_super) {
  __extends(Get, _super);

  function Get() {
    _ref8 = Get.__super__.constructor.apply(this, arguments);
    return _ref8;
  }

  Get.prototype.tt = Term.TermType.GET;

  Get.prototype.mt = 'get';

  return Get;

})(RDBOp);

GetAll = (function(_super) {
  __extends(GetAll, _super);

  function GetAll() {
    _ref9 = GetAll.__super__.constructor.apply(this, arguments);
    return _ref9;
  }

  GetAll.prototype.tt = Term.TermType.GET_ALL;

  GetAll.prototype.mt = 'getAll';

  return GetAll;

})(RDBOp);

Eq = (function(_super) {
  __extends(Eq, _super);

  function Eq() {
    _ref10 = Eq.__super__.constructor.apply(this, arguments);
    return _ref10;
  }

  Eq.prototype.tt = Term.TermType.EQ;

  Eq.prototype.mt = 'eq';

  return Eq;

})(RDBOp);

Ne = (function(_super) {
  __extends(Ne, _super);

  function Ne() {
    _ref11 = Ne.__super__.constructor.apply(this, arguments);
    return _ref11;
  }

  Ne.prototype.tt = Term.TermType.NE;

  Ne.prototype.mt = 'ne';

  return Ne;

})(RDBOp);

Lt = (function(_super) {
  __extends(Lt, _super);

  function Lt() {
    _ref12 = Lt.__super__.constructor.apply(this, arguments);
    return _ref12;
  }

  Lt.prototype.tt = Term.TermType.LT;

  Lt.prototype.mt = 'lt';

  return Lt;

})(RDBOp);

Le = (function(_super) {
  __extends(Le, _super);

  function Le() {
    _ref13 = Le.__super__.constructor.apply(this, arguments);
    return _ref13;
  }

  Le.prototype.tt = Term.TermType.LE;

  Le.prototype.mt = 'le';

  return Le;

})(RDBOp);

Gt = (function(_super) {
  __extends(Gt, _super);

  function Gt() {
    _ref14 = Gt.__super__.constructor.apply(this, arguments);
    return _ref14;
  }

  Gt.prototype.tt = Term.TermType.GT;

  Gt.prototype.mt = 'gt';

  return Gt;

})(RDBOp);

Ge = (function(_super) {
  __extends(Ge, _super);

  function Ge() {
    _ref15 = Ge.__super__.constructor.apply(this, arguments);
    return _ref15;
  }

  Ge.prototype.tt = Term.TermType.GE;

  Ge.prototype.mt = 'ge';

  return Ge;

})(RDBOp);

Not = (function(_super) {
  __extends(Not, _super);

  function Not() {
    _ref16 = Not.__super__.constructor.apply(this, arguments);
    return _ref16;
  }

  Not.prototype.tt = Term.TermType.NOT;

  Not.prototype.mt = 'not';

  return Not;

})(RDBOp);

Add = (function(_super) {
  __extends(Add, _super);

  function Add() {
    _ref17 = Add.__super__.constructor.apply(this, arguments);
    return _ref17;
  }

  Add.prototype.tt = Term.TermType.ADD;

  Add.prototype.mt = 'add';

  return Add;

})(RDBOp);

Sub = (function(_super) {
  __extends(Sub, _super);

  function Sub() {
    _ref18 = Sub.__super__.constructor.apply(this, arguments);
    return _ref18;
  }

  Sub.prototype.tt = Term.TermType.SUB;

  Sub.prototype.mt = 'sub';

  return Sub;

})(RDBOp);

Mul = (function(_super) {
  __extends(Mul, _super);

  function Mul() {
    _ref19 = Mul.__super__.constructor.apply(this, arguments);
    return _ref19;
  }

  Mul.prototype.tt = Term.TermType.MUL;

  Mul.prototype.mt = 'mul';

  return Mul;

})(RDBOp);

Div = (function(_super) {
  __extends(Div, _super);

  function Div() {
    _ref20 = Div.__super__.constructor.apply(this, arguments);
    return _ref20;
  }

  Div.prototype.tt = Term.TermType.DIV;

  Div.prototype.mt = 'div';

  return Div;

})(RDBOp);

Mod = (function(_super) {
  __extends(Mod, _super);

  function Mod() {
    _ref21 = Mod.__super__.constructor.apply(this, arguments);
    return _ref21;
  }

  Mod.prototype.tt = Term.TermType.MOD;

  Mod.prototype.mt = 'mod';

  return Mod;

})(RDBOp);

Append = (function(_super) {
  __extends(Append, _super);

  function Append() {
    _ref22 = Append.__super__.constructor.apply(this, arguments);
    return _ref22;
  }

  Append.prototype.tt = Term.TermType.APPEND;

  Append.prototype.mt = 'append';

  return Append;

})(RDBOp);

Slice = (function(_super) {
  __extends(Slice, _super);

  function Slice() {
    _ref23 = Slice.__super__.constructor.apply(this, arguments);
    return _ref23;
  }

  Slice.prototype.tt = Term.TermType.SLICE;

  Slice.prototype.st = 'slice';

  return Slice;

})(RDBOp);

Skip = (function(_super) {
  __extends(Skip, _super);

  function Skip() {
    _ref24 = Skip.__super__.constructor.apply(this, arguments);
    return _ref24;
  }

  Skip.prototype.tt = Term.TermType.SKIP;

  Skip.prototype.mt = 'skip';

  return Skip;

})(RDBOp);

Limit = (function(_super) {
  __extends(Limit, _super);

  function Limit() {
    _ref25 = Limit.__super__.constructor.apply(this, arguments);
    return _ref25;
  }

  Limit.prototype.tt = Term.TermType.LIMIT;

  Limit.prototype.st = 'limit';

  return Limit;

})(RDBOp);

GetAttr = (function(_super) {
  __extends(GetAttr, _super);

  function GetAttr() {
    _ref26 = GetAttr.__super__.constructor.apply(this, arguments);
    return _ref26;
  }

  GetAttr.prototype.tt = Term.TermType.GETATTR;

  GetAttr.prototype.compose = function(args) {
    return [args[0], '(', args[1], ')'];
  };

  return GetAttr;

})(RDBOp);

Contains = (function(_super) {
  __extends(Contains, _super);

  function Contains() {
    _ref27 = Contains.__super__.constructor.apply(this, arguments);
    return _ref27;
  }

  Contains.prototype.tt = Term.TermType.CONTAINS;

  Contains.prototype.mt = 'contains';

  return Contains;

})(RDBOp);

Pluck = (function(_super) {
  __extends(Pluck, _super);

  function Pluck() {
    _ref28 = Pluck.__super__.constructor.apply(this, arguments);
    return _ref28;
  }

  Pluck.prototype.tt = Term.TermType.PLUCK;

  Pluck.prototype.mt = 'pluck';

  return Pluck;

})(RDBOp);

Without = (function(_super) {
  __extends(Without, _super);

  function Without() {
    _ref29 = Without.__super__.constructor.apply(this, arguments);
    return _ref29;
  }

  Without.prototype.tt = Term.TermType.WITHOUT;

  Without.prototype.mt = 'without';

  return Without;

})(RDBOp);

Merge = (function(_super) {
  __extends(Merge, _super);

  function Merge() {
    _ref30 = Merge.__super__.constructor.apply(this, arguments);
    return _ref30;
  }

  Merge.prototype.tt = Term.TermType.MERGE;

  Merge.prototype.mt = 'merge';

  return Merge;

})(RDBOp);

Between = (function(_super) {
  __extends(Between, _super);

  function Between() {
    _ref31 = Between.__super__.constructor.apply(this, arguments);
    return _ref31;
  }

  Between.prototype.tt = Term.TermType.BETWEEN;

  Between.prototype.mt = 'between';

  return Between;

})(RDBOp);

Reduce = (function(_super) {
  __extends(Reduce, _super);

  function Reduce() {
    _ref32 = Reduce.__super__.constructor.apply(this, arguments);
    return _ref32;
  }

  Reduce.prototype.tt = Term.TermType.REDUCE;

  Reduce.prototype.mt = 'reduce';

  return Reduce;

})(RDBOp);

Map = (function(_super) {
  __extends(Map, _super);

  function Map() {
    _ref33 = Map.__super__.constructor.apply(this, arguments);
    return _ref33;
  }

  Map.prototype.tt = Term.TermType.MAP;

  Map.prototype.mt = 'map';

  return Map;

})(RDBOp);

Filter = (function(_super) {
  __extends(Filter, _super);

  function Filter() {
    _ref34 = Filter.__super__.constructor.apply(this, arguments);
    return _ref34;
  }

  Filter.prototype.tt = Term.TermType.FILTER;

  Filter.prototype.mt = 'filter';

  return Filter;

})(RDBOp);

ConcatMap = (function(_super) {
  __extends(ConcatMap, _super);

  function ConcatMap() {
    _ref35 = ConcatMap.__super__.constructor.apply(this, arguments);
    return _ref35;
  }

  ConcatMap.prototype.tt = Term.TermType.CONCATMAP;

  ConcatMap.prototype.mt = 'concatMap';

  return ConcatMap;

})(RDBOp);

OrderBy = (function(_super) {
  __extends(OrderBy, _super);

  function OrderBy() {
    _ref36 = OrderBy.__super__.constructor.apply(this, arguments);
    return _ref36;
  }

  OrderBy.prototype.tt = Term.TermType.ORDERBY;

  OrderBy.prototype.mt = 'orderBy';

  return OrderBy;

})(RDBOp);

Distinct = (function(_super) {
  __extends(Distinct, _super);

  function Distinct() {
    _ref37 = Distinct.__super__.constructor.apply(this, arguments);
    return _ref37;
  }

  Distinct.prototype.tt = Term.TermType.DISTINCT;

  Distinct.prototype.mt = 'distinct';

  return Distinct;

})(RDBOp);

Count = (function(_super) {
  __extends(Count, _super);

  function Count() {
    _ref38 = Count.__super__.constructor.apply(this, arguments);
    return _ref38;
  }

  Count.prototype.tt = Term.TermType.COUNT;

  Count.prototype.mt = 'count';

  return Count;

})(RDBOp);

Union = (function(_super) {
  __extends(Union, _super);

  function Union() {
    _ref39 = Union.__super__.constructor.apply(this, arguments);
    return _ref39;
  }

  Union.prototype.tt = Term.TermType.UNION;

  Union.prototype.mt = 'union';

  return Union;

})(RDBOp);

Nth = (function(_super) {
  __extends(Nth, _super);

  function Nth() {
    _ref40 = Nth.__super__.constructor.apply(this, arguments);
    return _ref40;
  }

  Nth.prototype.tt = Term.TermType.NTH;

  Nth.prototype.mt = 'nth';

  return Nth;

})(RDBOp);

GroupedMapReduce = (function(_super) {
  __extends(GroupedMapReduce, _super);

  function GroupedMapReduce() {
    _ref41 = GroupedMapReduce.__super__.constructor.apply(this, arguments);
    return _ref41;
  }

  GroupedMapReduce.prototype.tt = Term.TermType.GROUPED_MAP_REDUCE;

  GroupedMapReduce.prototype.mt = 'groupedMapReduce';

  return GroupedMapReduce;

})(RDBOp);

GroupBy = (function(_super) {
  __extends(GroupBy, _super);

  function GroupBy() {
    _ref42 = GroupBy.__super__.constructor.apply(this, arguments);
    return _ref42;
  }

  GroupBy.prototype.tt = Term.TermType.GROUPBY;

  GroupBy.prototype.mt = 'groupBy';

  return GroupBy;

})(RDBOp);

GroupBy = (function(_super) {
  __extends(GroupBy, _super);

  function GroupBy() {
    _ref43 = GroupBy.__super__.constructor.apply(this, arguments);
    return _ref43;
  }

  GroupBy.prototype.tt = Term.TermType.GROUPBY;

  GroupBy.prototype.mt = 'groupBy';

  return GroupBy;

})(RDBOp);

InnerJoin = (function(_super) {
  __extends(InnerJoin, _super);

  function InnerJoin() {
    _ref44 = InnerJoin.__super__.constructor.apply(this, arguments);
    return _ref44;
  }

  InnerJoin.prototype.tt = Term.TermType.INNER_JOIN;

  InnerJoin.prototype.mt = 'innerJoin';

  return InnerJoin;

})(RDBOp);

OuterJoin = (function(_super) {
  __extends(OuterJoin, _super);

  function OuterJoin() {
    _ref45 = OuterJoin.__super__.constructor.apply(this, arguments);
    return _ref45;
  }

  OuterJoin.prototype.tt = Term.TermType.OUTER_JOIN;

  OuterJoin.prototype.mt = 'outerJoin';

  return OuterJoin;

})(RDBOp);

EqJoin = (function(_super) {
  __extends(EqJoin, _super);

  function EqJoin() {
    _ref46 = EqJoin.__super__.constructor.apply(this, arguments);
    return _ref46;
  }

  EqJoin.prototype.tt = Term.TermType.EQ_JOIN;

  EqJoin.prototype.mt = 'eqJoin';

  return EqJoin;

})(RDBOp);

Zip = (function(_super) {
  __extends(Zip, _super);

  function Zip() {
    _ref47 = Zip.__super__.constructor.apply(this, arguments);
    return _ref47;
  }

  Zip.prototype.tt = Term.TermType.ZIP;

  Zip.prototype.mt = 'zip';

  return Zip;

})(RDBOp);

CoerceTo = (function(_super) {
  __extends(CoerceTo, _super);

  function CoerceTo() {
    _ref48 = CoerceTo.__super__.constructor.apply(this, arguments);
    return _ref48;
  }

  CoerceTo.prototype.tt = Term.TermType.COERCE_TO;

  CoerceTo.prototype.mt = 'coerceTo';

  return CoerceTo;

})(RDBOp);

TypeOf = (function(_super) {
  __extends(TypeOf, _super);

  function TypeOf() {
    _ref49 = TypeOf.__super__.constructor.apply(this, arguments);
    return _ref49;
  }

  TypeOf.prototype.tt = Term.TermType.TYPEOF;

  TypeOf.prototype.mt = 'typeOf';

  return TypeOf;

})(RDBOp);

Info = (function(_super) {
  __extends(Info, _super);

  function Info() {
    _ref50 = Info.__super__.constructor.apply(this, arguments);
    return _ref50;
  }

  Info.prototype.tt = Term.TermType.INFO;

  Info.prototype.mt = 'info';

  return Info;

})(RDBOp);

Update = (function(_super) {
  __extends(Update, _super);

  function Update() {
    _ref51 = Update.__super__.constructor.apply(this, arguments);
    return _ref51;
  }

  Update.prototype.tt = Term.TermType.UPDATE;

  Update.prototype.mt = 'update';

  return Update;

})(RDBOp);

Delete = (function(_super) {
  __extends(Delete, _super);

  function Delete() {
    _ref52 = Delete.__super__.constructor.apply(this, arguments);
    return _ref52;
  }

  Delete.prototype.tt = Term.TermType.DELETE;

  Delete.prototype.mt = 'delete';

  return Delete;

})(RDBOp);

Replace = (function(_super) {
  __extends(Replace, _super);

  function Replace() {
    _ref53 = Replace.__super__.constructor.apply(this, arguments);
    return _ref53;
  }

  Replace.prototype.tt = Term.TermType.REPLACE;

  Replace.prototype.mt = 'replace';

  return Replace;

})(RDBOp);

Insert = (function(_super) {
  __extends(Insert, _super);

  function Insert() {
    _ref54 = Insert.__super__.constructor.apply(this, arguments);
    return _ref54;
  }

  Insert.prototype.tt = Term.TermType.INSERT;

  Insert.prototype.mt = 'insert';

  return Insert;

})(RDBOp);

DbCreate = (function(_super) {
  __extends(DbCreate, _super);

  function DbCreate() {
    _ref55 = DbCreate.__super__.constructor.apply(this, arguments);
    return _ref55;
  }

  DbCreate.prototype.tt = Term.TermType.DB_CREATE;

  DbCreate.prototype.st = 'dbCreate';

  return DbCreate;

})(RDBOp);

DbDrop = (function(_super) {
  __extends(DbDrop, _super);

  function DbDrop() {
    _ref56 = DbDrop.__super__.constructor.apply(this, arguments);
    return _ref56;
  }

  DbDrop.prototype.tt = Term.TermType.DB_DROP;

  DbDrop.prototype.st = 'dbDrop';

  return DbDrop;

})(RDBOp);

DbList = (function(_super) {
  __extends(DbList, _super);

  function DbList() {
    _ref57 = DbList.__super__.constructor.apply(this, arguments);
    return _ref57;
  }

  DbList.prototype.tt = Term.TermType.DB_LIST;

  DbList.prototype.st = 'dbList';

  return DbList;

})(RDBOp);

TableCreate = (function(_super) {
  __extends(TableCreate, _super);

  function TableCreate() {
    _ref58 = TableCreate.__super__.constructor.apply(this, arguments);
    return _ref58;
  }

  TableCreate.prototype.tt = Term.TermType.TABLE_CREATE;

  TableCreate.prototype.mt = 'tableCreate';

  return TableCreate;

})(RDBOp);

TableDrop = (function(_super) {
  __extends(TableDrop, _super);

  function TableDrop() {
    _ref59 = TableDrop.__super__.constructor.apply(this, arguments);
    return _ref59;
  }

  TableDrop.prototype.tt = Term.TermType.TABLE_DROP;

  TableDrop.prototype.mt = 'tableDrop';

  return TableDrop;

})(RDBOp);

TableList = (function(_super) {
  __extends(TableList, _super);

  function TableList() {
    _ref60 = TableList.__super__.constructor.apply(this, arguments);
    return _ref60;
  }

  TableList.prototype.tt = Term.TermType.TABLE_LIST;

  TableList.prototype.mt = 'tableList';

  return TableList;

})(RDBOp);

IndexCreate = (function(_super) {
  __extends(IndexCreate, _super);

  function IndexCreate() {
    _ref61 = IndexCreate.__super__.constructor.apply(this, arguments);
    return _ref61;
  }

  IndexCreate.prototype.tt = Term.TermType.INDEX_CREATE;

  IndexCreate.prototype.mt = 'indexCreate';

  return IndexCreate;

})(RDBOp);

IndexDrop = (function(_super) {
  __extends(IndexDrop, _super);

  function IndexDrop() {
    _ref62 = IndexDrop.__super__.constructor.apply(this, arguments);
    return _ref62;
  }

  IndexDrop.prototype.tt = Term.TermType.INDEX_DROP;

  IndexDrop.prototype.mt = 'indexDrop';

  return IndexDrop;

})(RDBOp);

IndexList = (function(_super) {
  __extends(IndexList, _super);

  function IndexList() {
    _ref63 = IndexList.__super__.constructor.apply(this, arguments);
    return _ref63;
  }

  IndexList.prototype.tt = Term.TermType.INDEX_LIST;

  IndexList.prototype.mt = 'indexList';

  return IndexList;

})(RDBOp);

FunCall = (function(_super) {
  __extends(FunCall, _super);

  function FunCall() {
    _ref64 = FunCall.__super__.constructor.apply(this, arguments);
    return _ref64;
  }

  FunCall.prototype.tt = Term.TermType.FUNCALL;

  FunCall.prototype.compose = function(args) {
    if (args.length > 2) {
      return ['r.do(', intsp(args.slice(1)), ', ', args[0], ')'];
    } else {
      if (shouldWrap(this.args[1])) {
        args[1] = ['r(', args[1], ')'];
      }
      return [args[1], '.do(', args[0], ')'];
    }
  };

  return FunCall;

})(RDBOp);

Branch = (function(_super) {
  __extends(Branch, _super);

  function Branch() {
    _ref65 = Branch.__super__.constructor.apply(this, arguments);
    return _ref65;
  }

  Branch.prototype.tt = Term.TermType.BRANCH;

  Branch.prototype.st = 'branch';

  return Branch;

})(RDBOp);

Any = (function(_super) {
  __extends(Any, _super);

  function Any() {
    _ref66 = Any.__super__.constructor.apply(this, arguments);
    return _ref66;
  }

  Any.prototype.tt = Term.TermType.ANY;

  Any.prototype.mt = 'or';

  return Any;

})(RDBOp);

All = (function(_super) {
  __extends(All, _super);

  function All() {
    _ref67 = All.__super__.constructor.apply(this, arguments);
    return _ref67;
  }

  All.prototype.tt = Term.TermType.ALL;

  All.prototype.mt = 'and';

  return All;

})(RDBOp);

ForEach = (function(_super) {
  __extends(ForEach, _super);

  function ForEach() {
    _ref68 = ForEach.__super__.constructor.apply(this, arguments);
    return _ref68;
  }

  ForEach.prototype.tt = Term.TermType.FOREACH;

  ForEach.prototype.mt = 'forEach';

  return ForEach;

})(RDBOp);

funcWrap = function(val) {
  var ivarScan;

  val = rethinkdb.expr(val);
  ivarScan = function(node) {
    var k, v;

    if (!(node instanceof TermBase)) {
      return false;
    }
    if (node instanceof ImplicitVar) {
      return true;
    }
    if ((node.args.map(ivarScan)).some(function(a) {
      return a;
    })) {
      return true;
    }
    if (((function() {
      var _ref69, _results;

      _ref69 = node.optargs;
      _results = [];
      for (k in _ref69) {
        if (!__hasProp.call(_ref69, k)) continue;
        v = _ref69[k];
        _results.push(v);
      }
      return _results;
    })()).map(ivarScan).some(function(a) {
      return a;
    })) {
      return true;
    }
    return false;
  };
  if (ivarScan(val)) {
    return new Func({}, function(x) {
      return val;
    });
  }
  return val;
};

Func = (function(_super) {
  __extends(Func, _super);

  Func.prototype.tt = Term.TermType.FUNC;

  Func.nextVarId = 0;

  function Func(optargs, func) {
    var argNums, args, argsArr, body, i;

    args = [];
    argNums = [];
    i = 0;
    while (i < func.length) {
      argNums.push(Func.nextVarId);
      args.push(new Var({}, Func.nextVarId));
      Func.nextVarId++;
      i++;
    }
    body = func.apply(null, args);
    argsArr = (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(MakeArray, [{}].concat(__slice.call(argNums)), function(){});
    return Func.__super__.constructor.call(this, optargs, argsArr, body);
  }

  Func.prototype.compose = function(args) {
    var arg;

    return [
      'function(', (function() {
        var _i, _len, _ref69, _results;

        _ref69 = args[0].slice(1, -1);
        _results = [];
        for (_i = 0, _len = _ref69.length; _i < _len; _i++) {
          arg = _ref69[_i];
          _results.push(Var.prototype.compose(arg));
        }
        return _results;
      })(), ') { return ', args[1], '; }'
    ];
  };

  return Func;

})(RDBOp);

Asc = (function(_super) {
  __extends(Asc, _super);

  function Asc() {
    _ref69 = Asc.__super__.constructor.apply(this, arguments);
    return _ref69;
  }

  Asc.prototype.tt = Term.TermType.ASC;

  Asc.prototype.st = 'asc';

  return Asc;

})(RDBOp);

Desc = (function(_super) {
  __extends(Desc, _super);

  function Desc() {
    _ref70 = Desc.__super__.constructor.apply(this, arguments);
    return _ref70;
  }

  Desc.prototype.tt = Term.TermType.DESC;

  Desc.prototype.st = 'desc';

  return Desc;

})(RDBOp);
// Generated by CoffeeScript 1.6.2
var __slice = [].slice;

goog.provide("rethinkdb.query");

goog.require("rethinkdb.base");

goog.require("rethinkdb.ast");

rethinkdb.expr = ar(function(val) {
  if (val instanceof TermBase) {
    return val;
  } else if (val instanceof Function) {
    return new Func({}, val);
  } else if (goog.isArray(val)) {
    return (function(func, args, ctor) {
      ctor.prototype = func.prototype;
      var child = new ctor, result = func.apply(child, args);
      return Object(result) === result ? result : child;
    })(MakeArray, [{}].concat(__slice.call(val)), function(){});
  } else if (goog.isObject(val)) {
    return new MakeObject(val);
  } else {
    return new DatumTerm(val);
  }
});

rethinkdb.js = aropt(function(jssrc, opts) {
  return new JavaScript(opts, jssrc);
});

rethinkdb.error = ar(function(errstr) {
  return new UserError({}, errstr);
});

rethinkdb.row = new ImplicitVar({});

rethinkdb.table = aropt(function(tblName, opts) {
  return new Table(opts, tblName);
});

rethinkdb.db = ar(function(dbName) {
  return new Db({}, dbName);
});

rethinkdb.dbCreate = ar(function(dbName) {
  return new DbCreate({}, dbName);
});

rethinkdb.dbDrop = ar(function(dbName) {
  return new DbDrop({}, dbName);
});

rethinkdb.dbList = ar(function() {
  return new DbList({});
});

rethinkdb.tableCreate = aropt(function(tblName, opts) {
  return new TableCreate(opts, tblName);
});

rethinkdb.tableDrop = ar(function(tblName) {
  return new TableDrop({}, tblName);
});

rethinkdb.tableList = ar(function() {
  return new TableList({});
});

rethinkdb["do"] = varar(1, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(FunCall, [{}, funcWrap(args.slice(-1)[0])].concat(__slice.call(args.slice(0, -1))), function(){});
});

rethinkdb.branch = ar(function(test, trueBranch, falseBranch) {
  return new Branch({}, test, trueBranch, falseBranch);
});

rethinkdb.count = {
  'COUNT': true
};

rethinkdb.sum = ar(function(attr) {
  return {
    'SUM': attr
  };
});

rethinkdb.avg = ar(function(attr) {
  return {
    'AVG': attr
  };
});

rethinkdb.asc = function(attr) {
  return new Asc({}, attr);
};

rethinkdb.desc = function(attr) {
  return new Desc({}, attr);
};

rethinkdb.eq = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Eq, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.ne = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Ne, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.lt = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Lt, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.le = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Le, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.gt = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Gt, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.ge = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Ge, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.or = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Any, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.and = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(All, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.not = ar(function(x) {
  return new Not({}, x);
});

rethinkdb.add = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Add, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.sub = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Sub, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.mul = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Mul, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.div = varar(2, null, function() {
  var args;

  args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return (function(func, args, ctor) {
    ctor.prototype = func.prototype;
    var child = new ctor, result = func.apply(child, args);
    return Object(result) === result ? result : child;
  })(Div, [{}].concat(__slice.call(args)), function(){});
});

rethinkdb.mod = ar(function(a, b) {
  return new Mod({}, a, b);
});

rethinkdb.typeOf = ar(function(val) {
  return new TypeOf({}, val);
});

rethinkdb.info = ar(function(val) {
  return new Info({}, val);
});
// Generated by CoffeeScript 1.6.2
var ArrayResult, Cursor, IterableResult, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

goog.provide("rethinkdb.cursor");

goog.require("rethinkdb.base");

IterableResult = (function() {
  function IterableResult() {}

  IterableResult.prototype.hasNext = function() {
    throw "Abstract Method";
  };

  IterableResult.prototype.next = function() {
    throw "Abstract Method";
  };

  IterableResult.prototype.each = ar(function(cb) {
    var n,
      _this = this;

    n = function() {
      return _this.next(function(err, row) {
        cb(err, row);
        if (_this.hasNext()) {
          return n();
        }
      });
    };
    if (this.hasNext()) {
      return n();
    }
  });

  IterableResult.prototype.toArray = ar(function(cb) {
    var arr,
      _this = this;

    arr = [];
    if (!this.hasNext()) {
      cb(null, arr);
    }
    return this.each(function(err, row) {
      if (err != null) {
        cb(err);
      } else {
        arr.push(row);
      }
      if (!_this.hasNext()) {
        return cb(null, arr);
      }
    });
  });

  return IterableResult;

})();

Cursor = (function(_super) {
  __extends(Cursor, _super);

  function Cursor(conn, token) {
    this._conn = conn;
    this._token = token;
    this._chunks = [];
    this._endFlag = false;
    this._contFlag = false;
    this._cont = null;
    this._cbQueue = [];
  }

  Cursor.prototype._addChunk = function(chunk) {
    if (chunk.length > 0) {
      return this._chunks.push(chunk);
    }
  };

  Cursor.prototype._addData = function(chunk) {
    this._addChunk(chunk);
    this._contFlag = false;
    this._promptNext();
    return this;
  };

  Cursor.prototype._endData = function(chunk) {
    this._addChunk(chunk);
    this._endFlag = true;
    this._contFlag = true;
    this._promptNext();
    return this;
  };

  Cursor.prototype._promptNext = function() {
    var cb, chunk, row;

    while (this._cbQueue[0] != null) {
      if (!this.hasNext()) {
        cb = this._cbQueue.shift();
        cb(new RqlDriverError("No more rows in the cursor."));
      } else {
        chunk = this._chunks[0];
        if (chunk == null) {
          this._promptCont();
          return;
        } else {
          row = chunk.shift();
          cb = this._cbQueue.shift();
          if (chunk[0] === void 0) {
            this._chunks.shift();
          }
          cb(null, row);
        }
      }
    }
  };

  Cursor.prototype._promptCont = function() {
    if (!this._contFlag) {
      this._conn._continueQuery(this._token);
      return this._contFlag = true;
    }
  };

  Cursor.prototype.hasNext = ar(function() {
    return !this._endFlag || (this._chunks[0] != null);
  });

  Cursor.prototype.next = ar(function(cb) {
    this._cbQueue.push(cb);
    return this._promptNext();
  });

  Cursor.prototype.close = ar(function() {
    if (!this._endFlag) {
      return this._conn._end(this._token);
    }
  });

  Cursor.prototype.toString = ar(function() {
    return "[object Cursor]";
  });

  return Cursor;

})(IterableResult);

ArrayResult = (function(_super) {
  __extends(ArrayResult, _super);

  function ArrayResult() {
    _ref = ArrayResult.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  ArrayResult.prototype.hasNext = ar(function() {
    return this.__index < this.length;
  });

  ArrayResult.prototype.next = ar(function(cb) {
    return cb(null, this[this.__proto__.__index++]);
  });

  ArrayResult.prototype.makeIterable = function(response) {
    var method, name, _ref1;

    _ref1 = ArrayResult.prototype;
    for (name in _ref1) {
      method = _ref1[name];
      response.__proto__[name] = method;
    }
    response.__proto__.__index = 0;
    return response;
  };

  return ArrayResult;

})(IterableResult);
// Copyright 2008 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Base class for all Protocol Buffer 2 serializers.
 */

goog.provide('goog.proto2.Serializer');

goog.require('goog.proto2.Descriptor');
goog.require('goog.proto2.FieldDescriptor');
goog.require('goog.proto2.Message');
goog.require('goog.proto2.Util');



/**
 * Abstract base class for PB2 serializers. A serializer is a class which
 * implements the serialization and deserialization of a Protocol Buffer Message
 * to/from a specific format.
 *
 * @constructor
 */
goog.proto2.Serializer = function() {};


/**
 * Serializes a message to the expected format.
 *
 * @param {goog.proto2.Message} message The message to be serialized.
 *
 * @return {*} The serialized form of the message.
 */
goog.proto2.Serializer.prototype.serialize = goog.abstractMethod;


/**
 * Returns the serialized form of the given value for the given field
 * if the field is a Message or Group and returns the value unchanged
 * otherwise.
 *
 * @param {goog.proto2.FieldDescriptor} field The field from which this
 *     value came.
 *
 * @param {*} value The value of the field.
 *
 * @return {*} The value.
 * @protected
 */
goog.proto2.Serializer.prototype.getSerializedValue = function(field, value) {
  if (field.isCompositeType()) {
    return this.serialize(/** @type {goog.proto2.Message} */ (value));
  } else {
    return value;
  }
};


/**
 * Deserializes a message from the expected format.
 *
 * @param {goog.proto2.Descriptor} descriptor The descriptor of the message
 *     to be created.
 * @param {*} data The data of the message.
 *
 * @return {goog.proto2.Message} The message created.
 */
goog.proto2.Serializer.prototype.deserialize = function(descriptor, data) {
  var message = descriptor.createMessageInstance();
  this.deserializeTo(message, data);
  goog.proto2.Util.assert(message instanceof goog.proto2.Message);
  return message;
};


/**
 * Deserializes a message from the expected format and places the
 * data in the message.
 *
 * @param {goog.proto2.Message} message The message in which to
 *     place the information.
 * @param {*} data The data of the message.
 */
goog.proto2.Serializer.prototype.deserializeTo = goog.abstractMethod;


/**
 * Returns the deserialized form of the given value for the given field if the
 * field is a Message or Group and returns the value, converted or unchanged,
 * for primitive field types otherwise.
 *
 * @param {goog.proto2.FieldDescriptor} field The field from which this
 *     value came.
 *
 * @param {*} value The value of the field.
 *
 * @return {*} The value.
 * @protected
 */
goog.proto2.Serializer.prototype.getDeserializedValue = function(field, value) {
  // Composite types are deserialized recursively.
  if (field.isCompositeType()) {
    if (value instanceof goog.proto2.Message) {
      return value;
    }

    return this.deserialize(field.getFieldMessageType(), value);
  }

  // Return the raw value if the field does not allow the JSON input to be
  // converted.
  if (!field.deserializationConversionPermitted()) {
    return value;
  }

  // Convert to native type of field.  Return the converted value or fall
  // through to return the raw value.  The JSON encoding of int64 value 123
  // might be either the number 123 or the string "123".  The field native type
  // could be either Number or String (depending on field options in the .proto
  // file).  All four combinations should work correctly.
  var nativeType = field.getNativeType();
  if (nativeType === String) {
    // JSON numbers can be converted to strings.
    if (typeof value === 'number') {
      return String(value);
    }
  } else if (nativeType === Number) {
    // JSON strings are sometimes used for large integer numeric values.
    if (typeof value === 'string') {
      // Validate the string.  If the string is not an integral number, we would
      // rather have an assertion or error in the caller than a mysterious NaN
      // value.
      if (/^-?[0-9]+$/.test(value)) {
        return Number(value);
      }
    }
  }

  return value;
};
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Base class for all PB2 lazy deserializer. A lazy deserializer
 *   is a serializer whose deserialization occurs on the fly as data is
 *   requested. In order to use a lazy deserializer, the serialized form
 *   of the data must be an object or array that can be indexed by the tag
 *   number.
 *
 */

goog.provide('goog.proto2.LazyDeserializer');

goog.require('goog.proto2.Serializer');
goog.require('goog.proto2.Util');



/**
 * Base class for all lazy deserializers.
 *
 * @constructor
 * @extends {goog.proto2.Serializer}
 */
goog.proto2.LazyDeserializer = function() {};
goog.inherits(goog.proto2.LazyDeserializer, goog.proto2.Serializer);


/** @override */
goog.proto2.LazyDeserializer.prototype.deserialize =
  function(descriptor, data) {
  var message = descriptor.createMessageInstance();
  message.initializeForLazyDeserializer(this, data);
  goog.proto2.Util.assert(message instanceof goog.proto2.Message);
  return message;
};


/** @override */
goog.proto2.LazyDeserializer.prototype.deserializeTo = function(message, data) {
  throw new Error('Unimplemented');
};


/**
 * Deserializes a message field from the expected format and places the
 * data in the given message
 *
 * @param {goog.proto2.Message} message The message in which to
 *     place the information.
 * @param {goog.proto2.FieldDescriptor} field The field for which to set the
 *     message value.
 * @param {*} data The serialized data for the field.
 *
 * @return {*} The deserialized data or null for no value found.
 */
goog.proto2.LazyDeserializer.prototype.deserializeField = goog.abstractMethod;
// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

goog.provide('goog.math.Long');



/**
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing Longs.
 *
 * The internal representation of a long is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * Javascript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within Javascript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @param {number} low  The low (signed) 32 bits of the long.
 * @param {number} high  The high (signed) 32 bits of the long.
 * @constructor
 */
goog.math.Long = function(low, high) {
  /**
   * @type {number}
   * @private
   */
  this.low_ = low | 0;  // force into 32 signed bits.

  /**
   * @type {number}
   * @private
   */
  this.high_ = high | 0;  // force into 32 signed bits.
};


// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.


/**
 * A cache of the Long representations of small integer values.
 * @type {!Object}
 * @private
 */
goog.math.Long.IntCache_ = {};


/**
 * Returns a Long representing the given (32-bit) integer value.
 * @param {number} value The 32-bit integer in question.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = goog.math.Long.IntCache_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    goog.math.Long.IntCache_[value] = obj;
  }
  return obj;
};


/**
 * Returns a Long representing the given value, provided that it is a finite
 * number.  Otherwise, zero is returned.
 * @param {number} value The number in question.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return goog.math.Long.ZERO;
  } else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
    return goog.math.Long.MIN_VALUE;
  } else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
    return goog.math.Long.MAX_VALUE;
  } else if (value < 0) {
    return goog.math.Long.fromNumber(-value).negate();
  } else {
    return new goog.math.Long(
        (value % goog.math.Long.TWO_PWR_32_DBL_) | 0,
        (value / goog.math.Long.TWO_PWR_32_DBL_) | 0);
  }
};


/**
 * Returns a Long representing the 64-bit integer that comes by concatenating
 * the given high and low bits.  Each is assumed to use 32 bits.
 * @param {number} lowBits The low 32-bits.
 * @param {number} highBits The high 32-bits.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromBits = function(lowBits, highBits) {
  return new goog.math.Long(lowBits, highBits);
};


/**
 * Returns a Long representation of the given string, written using the given
 * radix.
 * @param {string} str The textual representation of the Long.
 * @param {number=} opt_radix The radix in which the text is written.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromString = function(str, opt_radix) {
  if (str.length == 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) == '-') {
    return goog.math.Long.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character: ' + str);
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

  var result = goog.math.Long.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = goog.math.Long.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(goog.math.Long.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(goog.math.Long.fromNumber(value));
    }
  }
  return result;
};


// NOTE: the compiler should inline these constant values below and then remove
// these variables, so there should be no runtime penalty for these.


/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function below.
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;


/**
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;


/**
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_32_DBL_ =
    goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


/**
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_31_DBL_ =
    goog.math.Long.TWO_PWR_32_DBL_ / 2;


/**
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_48_DBL_ =
    goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;


/**
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_64_DBL_ =
    goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;


/**
 * @type {number}
 * @private
 */
goog.math.Long.TWO_PWR_63_DBL_ =
    goog.math.Long.TWO_PWR_64_DBL_ / 2;


/** @type {!goog.math.Long} */
goog.math.Long.ZERO = goog.math.Long.fromInt(0);


/** @type {!goog.math.Long} */
goog.math.Long.ONE = goog.math.Long.fromInt(1);


/** @type {!goog.math.Long} */
goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);


/** @type {!goog.math.Long} */
goog.math.Long.MAX_VALUE =
    goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);


/** @type {!goog.math.Long} */
goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 0x80000000 | 0);


/**
 * @type {!goog.math.Long}
 * @private
 */
goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);


/** @return {number} The value, assuming it is a 32-bit integer. */
goog.math.Long.prototype.toInt = function() {
  return this.low_;
};


/** @return {number} The closest floating-point representation to this value. */
goog.math.Long.prototype.toNumber = function() {
  return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
         this.getLowBitsUnsigned();
};


/**
 * @param {number=} opt_radix The radix in which the text should be written.
 * @return {string} The textual representation of this value.
 * @override
 */
goog.math.Long.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  if (this.isNegative()) {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      // We need to change the Long value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      var radixLong = goog.math.Long.fromNumber(radix);
      var div = this.div(radixLong);
      var rem = div.multiply(radixLong).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.div(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};


/** @return {number} The high 32-bits as a signed value. */
goog.math.Long.prototype.getHighBits = function() {
  return this.high_;
};


/** @return {number} The low 32-bits as a signed value. */
goog.math.Long.prototype.getLowBits = function() {
  return this.low_;
};


/** @return {number} The low 32-bits as an unsigned value. */
goog.math.Long.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ?
      this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
};


/**
 * @return {number} Returns the number of bits needed to represent the absolute
 *     value of this Long.
 */
goog.math.Long.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(goog.math.Long.MIN_VALUE)) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ != 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) != 0) {
        break;
      }
    }
    return this.high_ != 0 ? bit + 33 : bit + 1;
  }
};


/** @return {boolean} Whether this value is zero. */
goog.math.Long.prototype.isZero = function() {
  return this.high_ == 0 && this.low_ == 0;
};


/** @return {boolean} Whether this value is negative. */
goog.math.Long.prototype.isNegative = function() {
  return this.high_ < 0;
};


/** @return {boolean} Whether this value is odd. */
goog.math.Long.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long equals the other.
 */
goog.math.Long.prototype.equals = function(other) {
  return (this.high_ == other.high_) && (this.low_ == other.low_);
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long does not equal the other.
 */
goog.math.Long.prototype.notEquals = function(other) {
  return (this.high_ != other.high_) || (this.low_ != other.low_);
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is less than the other.
 */
goog.math.Long.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is less than or equal to the other.
 */
goog.math.Long.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is greater than the other.
 */
goog.math.Long.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is greater than or equal to the other.
 */
goog.math.Long.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};


/**
 * Compares this Long with the given one.
 * @param {goog.math.Long} other Long to compare against.
 * @return {number} 0 if they are the same, 1 if the this is greater, and -1
 *     if the given one is greater.
 */
goog.math.Long.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  // at this point, the signs are the same, so subtraction will not overflow
  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};


/** @return {!goog.math.Long} The negation of this value. */
goog.math.Long.prototype.negate = function() {
  if (this.equals(goog.math.Long.MIN_VALUE)) {
    return goog.math.Long.MIN_VALUE;
  } else {
    return this.not().add(goog.math.Long.ONE);
  }
};


/**
 * Returns the sum of this and the given Long.
 * @param {goog.math.Long} other Long to add to this one.
 * @return {!goog.math.Long} The sum of this and the given Long.
 */
goog.math.Long.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns the difference of this and the given Long.
 * @param {goog.math.Long} other Long to subtract from this.
 * @return {!goog.math.Long} The difference of this and the given Long.
 */
goog.math.Long.prototype.subtract = function(other) {
  return this.add(other.negate());
};


/**
 * Returns the product of this and the given long.
 * @param {goog.math.Long} other Long to multiply with this.
 * @return {!goog.math.Long} The product of this and the other.
 */
goog.math.Long.prototype.multiply = function(other) {
  if (this.isZero()) {
    return goog.math.Long.ZERO;
  } else if (other.isZero()) {
    return goog.math.Long.ZERO;
  }

  if (this.equals(goog.math.Long.MIN_VALUE)) {
    return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
  } else if (other.equals(goog.math.Long.MIN_VALUE)) {
    return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both longs are small, use float multiplication
  if (this.lessThan(goog.math.Long.TWO_PWR_24_) &&
      other.lessThan(goog.math.Long.TWO_PWR_24_)) {
    return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns this Long divided by the given one.
 * @param {goog.math.Long} other Long by which to divide.
 * @return {!goog.math.Long} This Long divided by the given one.
 */
goog.math.Long.prototype.div = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return goog.math.Long.ZERO;
  }

  if (this.equals(goog.math.Long.MIN_VALUE)) {
    if (other.equals(goog.math.Long.ONE) ||
        other.equals(goog.math.Long.NEG_ONE)) {
      return goog.math.Long.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
    } else if (other.equals(goog.math.Long.MIN_VALUE)) {
      return goog.math.Long.ONE;
    } else {
      // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(goog.math.Long.ZERO)) {
        return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE;
      } else {
        var rem = this.subtract(other.multiply(approx));
        var result = approx.add(rem.div(other));
        return result;
      }
    }
  } else if (other.equals(goog.math.Long.MIN_VALUE)) {
    return goog.math.Long.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    } else {
      return this.negate().div(other).negate();
    }
  } else if (other.isNegative()) {
    return this.div(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = goog.math.Long.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = goog.math.Long.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = goog.math.Long.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = goog.math.Long.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};


/**
 * Returns this Long modulo the given one.
 * @param {goog.math.Long} other Long by which to mod.
 * @return {!goog.math.Long} This Long modulo the given one.
 */
goog.math.Long.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};


/** @return {!goog.math.Long} The bitwise-NOT of this value. */
goog.math.Long.prototype.not = function() {
  return goog.math.Long.fromBits(~this.low_, ~this.high_);
};


/**
 * Returns the bitwise-AND of this Long and the given one.
 * @param {goog.math.Long} other The Long with which to AND.
 * @return {!goog.math.Long} The bitwise-AND of this and the other.
 */
goog.math.Long.prototype.and = function(other) {
  return goog.math.Long.fromBits(this.low_ & other.low_,
                                 this.high_ & other.high_);
};


/**
 * Returns the bitwise-OR of this Long and the given one.
 * @param {goog.math.Long} other The Long with which to OR.
 * @return {!goog.math.Long} The bitwise-OR of this and the other.
 */
goog.math.Long.prototype.or = function(other) {
  return goog.math.Long.fromBits(this.low_ | other.low_,
                                 this.high_ | other.high_);
};


/**
 * Returns the bitwise-XOR of this Long and the given one.
 * @param {goog.math.Long} other The Long with which to XOR.
 * @return {!goog.math.Long} The bitwise-XOR of this and the other.
 */
goog.math.Long.prototype.xor = function(other) {
  return goog.math.Long.fromBits(this.low_ ^ other.low_,
                                 this.high_ ^ other.high_);
};


/**
 * Returns this Long with bits shifted to the left by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!goog.math.Long} This shifted to the left by the given amount.
 */
goog.math.Long.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return goog.math.Long.fromBits(
          low << numBits,
          (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return goog.math.Long.fromBits(0, low << (numBits - 32));
    }
  }
};


/**
 * Returns this Long with bits shifted to the right by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!goog.math.Long} This shifted to the right by the given amount.
 */
goog.math.Long.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return goog.math.Long.fromBits(
          (low >>> numBits) | (high << (32 - numBits)),
          high >> numBits);
    } else {
      return goog.math.Long.fromBits(
          high >> (numBits - 32),
          high >= 0 ? 0 : -1);
    }
  }
};


/**
 * Returns this Long with bits shifted to the right by the given amount, with
 * the new top bits matching the current sign bit.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!goog.math.Long} This shifted to the right by the given amount, with
 *     zeros placed into the new leading bits.
 */
goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return goog.math.Long.fromBits(
          (low >>> numBits) | (high << (32 - numBits)),
          high >>> numBits);
    } else if (numBits == 32) {
      return goog.math.Long.fromBits(high, 0);
    } else {
      return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
    }
  }
};
// Copyright 2012 Hexagram 49 Inc. All rights reserved.

/**
 * @fileoverview Protocol Buffer 2 Serializer which serializes messages
 *  into the protocol buffer wire format. Because this serializer provides
 *  support for the same format used by the C++, Java, and Python canonical
 *  protocol buffer implementations it allows Javascript applications to
 *  share messages with protocol buffer allications from other languages.
 * 
 * @author bill@rethinkdb.com (William Rowan)
 */

goog.provide('goog.proto2.WireFormatSerializer');

goog.require('goog.proto2.Serializer');
goog.require('goog.debug.Error');
goog.require('goog.math.Long');

// Unused here but necessary to load type information to please the type checker
goog.require('goog.proto2.LazyDeserializer');

/**
 * Utility functions for converting between the UTF-8 encoded arrays expected by
 * protobuf wire format and the javascript strings used by the js protobuf library.
 */

/**
 * The resulting encoding is a string with characters in the range 0x0000-0x00FF
 * @param {Uint8Array} array
 * @return {string}
 */
function UTF8ArrayToASCIIString(array) {
    var chars = [];
    for (var i = 0; i < array.length; i++) {
        chars.push(String.fromCharCode(array[i]));
    }
    return chars.join('');

    // This results in a string with a bunch of null characters in it, why?
    //return Array.prototype.map.call(array, String.fromCharCode).join('');
}

function UTF8ArrayToString(array) {
    // The resulting encoding is a string in the javascript native USC-2 encoding
    return decodeURIComponent(escape(UTF8ArrayToASCIIString(array)));
}

function ASCIIStringToArray(string) {
    // Takes a string with characters in the range 0x0000-0x00FF
    // (i.e. all single byte values) and returns the corresponding Uint8Array
    return new Uint8Array(Array.prototype.map.call(string, function(ch) {
        return ch.charCodeAt(0);
    }));
}

function StringToUTF8Array(string) {
    // Takes a standard USC-2 javascript string and returns a UTF-8 encoded Uint8Array
    return ASCIIStringToArray(unescape(encodeURIComponent(string)));
}

/**
 * WireFormatSerializer, a serializer which serializes messages to protocol
 * buffer wire format suitable for use by other protocol buffer implemtations.
 * @constructor
 * @extends {goog.proto2.Serializer}
 */
goog.proto2.WireFormatSerializer = function() {
    /**
     * Used during deserialization to track position in the stream.
     * @type {number}
     * @private
     */
     this.deserializationIndex_ = 0;
}
goog.inherits(goog.proto2.WireFormatSerializer, goog.proto2.Serializer);

/**
 * Called when deserilizing incorrectly formated messages
 * @param {string} errMsg
 * @private
 */
goog.proto2.WireFormatSerializer.prototype.badMessageFormat_ = function(errMsg) {
    throw new goog.debug.Error("Error deserializing incorrectly formated message, " + errMsg);
};

/**
 * Serializes a message to an ArrayBuffer. 
 * @param {goog.proto2.Message} message The message to be serialized.
 * @return {!Uint8Array} The serialized message in wire format.
 * @override
 */
goog.proto2.WireFormatSerializer.prototype.serialize = function(message) {
    var descriptor = message.getDescriptor();
    var fields = descriptor.getFields();

    var fieldEncodings = [];
    var totalLength = 0;
    for(var i = 0; i < fields.length; i++) {
        var field = fields[i];

        if(!message.has(field)) {
            continue;
        }

        var r = 0;
        do {
            var fieldBuffer = this.getSerializedValue(field, message.get(field, r));
            fieldEncodings.push(fieldBuffer);
            totalLength += fieldBuffer.byteLength;
            r++;
        } while(field.isRepeated() && (r < message.countOf(field)));
    }

    var resultArray = new Uint8Array(totalLength);

    var offset = 0;
    for(var i = 0; i < fieldEncodings.length; i++) {
        var enc = fieldEncodings[i];

        resultArray.set(new Uint8Array(enc), offset);
        offset += enc.byteLength;
    }

    return resultArray;
}

/**
 * @param {goog.proto2.FieldDescriptor} field
 * @param {*} value
 * @override
 */
goog.proto2.WireFormatSerializer.prototype.getSerializedValue = function(field, value) {
    var tag = field.getTag();
    var fieldType = field.getFieldType();
    var wireType = goog.proto2.WireFormatSerializer.WireTypeForFieldType(fieldType);

    var keyInt = (tag << 3) | wireType;
    var keyArray = this.encodeVarInt(goog.math.Long.fromNumber(keyInt));

    var valArray;
    switch(wireType) {
    case goog.proto2.WireFormatSerializer.WireType.VARINT:
        var integer = goog.math.Long.fromNumber(/** @type {number} */(value));

        if(fieldType == goog.proto2.FieldDescriptor.FieldType.SINT64 ||
           fieldType == goog.proto2.FieldDescriptor.FieldType.SINT32) {
            integer = this.zigZagEncode(integer); 
        }

        valArray = this.encodeVarInt(integer);
        break;
    case goog.proto2.WireFormatSerializer.WireType.FIXED64:
        valArray = this.encodeFixed64(field,/** @type {number} */(value));
        break;
    case goog.proto2.WireFormatSerializer.WireType.LENGTH_DELIMITED:
        valArray = this.encodeLengthDelimited(field, value);
        break;
    case goog.proto2.WireFormatSerializer.WireType.START_GROUP:
        this.badMessageFormat_("Use of Groups deprecated and not supported");
        break;
    case goog.proto2.WireFormatSerializer.WireType.FIXED32:
        valArray = this.encodeFixed32(field,/** @type {number} */(value));
        break;
    default:
        this.badMessageFormat_("Unexpected wire type");
    }

    var fieldEncoding = new Uint8Array(keyArray.length + valArray.length);
    fieldEncoding.set(new Uint8Array(keyArray), 0);
    fieldEncoding.set(new Uint8Array(valArray), keyArray.length);

    return fieldEncoding;
}

/**
 * Zig-zag encodes the integer.
 * @param {!goog.math.Long} longint The integer to be encoded.
 * @return {!goog.math.Long} The zig zag encoded integer.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.zigZagEncode = function(longint) {
    return longint.shiftLeft(1).xor(longint.shiftRight(63));
}

/**
 * Zig-zag decodes the integer.
 * @param {!goog.math.Long} longint The integer to be encoded.
 * @return {!goog.math.Long} The zig zag encoded integer.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.zigZagDecode = function(longint) {
    return longint.shiftRight(1).xor(longint.shiftLeft(63));
}

/**
 * Encodes an integer as a varint.
 * @param {!goog.math.Long} longint The integer to be encoded.
 * @return {!Uint8Array} The encoded value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.encodeVarInt = function(longint) {

    function encodeVarIntArray(longint) {
        var leastVal = longint.modulo(goog.math.Long.fromNumber(128)).toInt();

        var bytesArray;
        if(longint.greaterThan(goog.math.Long.fromNumber(127))) {
            leastVal += 128; // Set continuation bit

            bytesArray = encodeVarIntArray(longint.shiftRight(7));
            bytesArray.unshift(leastVal);
        } else {
            bytesArray = [leastVal];
        }

        return bytesArray;
    }

    var bytesArray = encodeVarIntArray(longint);
    return new Uint8Array(bytesArray);
}

/**
 * Encodes given number to a fixed 64 bit value. All numeric values are supplied
 * as 64 bit floats. Therefore, converting to the appropriate binary
 * representation is necessary and cannot be done with full precision for
 * integers.
 * @param {!goog.proto2.FieldDescriptor} field The field to be encoded.
 * @param {!number} value The value to be encoded.
 * @return {!Uint8Array} An 8 byte little endian array representing the value.
 */
goog.proto2.WireFormatSerializer.prototype.encodeFixed64 = function(field, value) {
    var buffer = new ArrayBuffer(8);
    var view = new DataView(buffer);

    // The format specifies that multibyte values be specified in little
    // endian order, thus the last argument for the set* functions.

    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.DOUBLE:
        view.setFloat64(0, value, true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.FIXED64:
        // No set Uint64, do 4 bytes at a time
        var longForm = goog.math.Long.fromNumber(value);
        view.setUint32(0, longForm.getLowBitsUnsigned(), true);
        view.setUint32(4, longForm.getHighBits(), true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.SFIXED64:
        var longForm = goog.math.Long.fromNumber(value);
        view.setUint32(0, longForm.getLowBitsUnsigned(), true);
        view.setInt32(4, longForm.getHighBits(), true);
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
        break;
    }

    return new Uint8Array(buffer);
}

/**
 * Encodes given number to a fixed 32 bit value.
 * @param {!goog.proto2.FieldDescriptor} field The field to be encoded.
 * @param {number} value The value to be encoded.
 * @return {!Uint8Array} A 4 byte little endian array representing the value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.encodeFixed32 =
        function(field, value) {
    var buffer = new ArrayBuffer(4);
    var view = new DataView(buffer);

    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.FLOAT:
        view.setFloat32(0, value, true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.FIXED32:
        view.setUint32(0, value, true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.SFIXED32:
        view.setInt32(0, value, true);
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
    }

    return new Uint8Array(buffer);
}

/**
 * Encodes the given value as a length delimited field. How the value is
 * encoded depends on the field type.
 * @param {!goog.proto2.FieldDescriptor} field The field to be encoded.
 * @param {*} value The value to be encoded.
 * @return {!Uint8Array} A multibyte little endian array representing the value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.encodeLengthDelimited =
        function(field, value) {
    var resultArray;

    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.MESSAGE:
        resultArray = this.serialize(/** @type {goog.proto2.Message} */(value));
        break;
    case goog.proto2.FieldDescriptor.FieldType.STRING:
        resultArray = StringToUTF8Array(/** @type {string} */(value));
        break;
    case goog.proto2.FieldDescriptor.FieldType.BYTES:
        resultArray = ASCIIStringToArray(/** @type {string} */(value));
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
    }

    var lengthInt = resultArray.length;
    var lengthArray = this.encodeVarInt(goog.math.Long.fromNumber(lengthInt));
    var finalArray = new Uint8Array(lengthArray.length + lengthInt);
    finalArray.set(lengthArray, 0);
    finalArray.set(resultArray, lengthArray.length);

    return finalArray;
}

/**
 * Deserializes data stream and initializes message object
 * @param {goog.proto2.Message} message The message to initialize.
 * @param {*} data The stream to deserialize.
 * @override 
 */
goog.proto2.WireFormatSerializer.prototype.deserializeTo = function(message, data) {

    var messageDescriptor = message.getDescriptor();
    this.deserializationIndex_ = 0;
    
    while(this.deserializationIndex_ < data.length) {
        var keyInt = this.decodeVarInt(/** @type {!Uint8Array} */(data));

        var tag = keyInt >> 3;
        var wireType = keyInt % 8;

        var field = messageDescriptor.findFieldByTag(tag);

        // Though field may be null we still decode the value to remove it
        // from the stream.
        var value = this.decodeValue(wireType, field, /** @type {!Uint8Array} */(data));

        if((field != null) && (value != null)) {
            if(field.isRepeated()) {
                message.add(field, value);
            } else {
                message.set(field, value);
            }
        }
    }
}

/**
 * Deserializes varint from data stream.
 * @param {!Uint8Array} data The data stream to read from.
 * @return {number} Decoded value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.decodeVarInt = function(data) {
    var intval = data[this.deserializationIndex_++];

    if(intval > 127) {

        // Unset continuation bit
        intval -= 128;

        var rest = this.decodeVarInt(data);
        intval += (rest << 7);
    }

    return intval;
}

/**
 * Deserializes the next value from the data stream.
 * @param {!number} wireType The wiretype to decode.
 * @param {goog.proto2.FieldDescriptor} field The field to deserialize.
 * @param {!Uint8Array} data The data stream to read from.
 * @return {*} The decoded value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.decodeValue =
        function(wireType, field, data) {
    var value;
    switch(wireType) {
    case goog.proto2.WireFormatSerializer.WireType.VARINT:
        value = this.decodeVarIntTypes(field, data);
        break;
    case goog.proto2.WireFormatSerializer.WireType.LENGTH_DELIMITED:
        value = this.decodeLengthDelimited(field, data);
        break;
    case goog.proto2.WireFormatSerializer.WireType.FIXED32:
        value = this.decodeFixed32(field, data);
        break;
    case goog.proto2.WireFormatSerializer.WireType.FIXED64:
        value = this.decodeFixed64(field, data);
        break;
    default:
        this.badMessageFormat_("Unexpected wire type of " + wireType);
        break;
    }

    return value;
}

/**
 * Decodes a varint from the stream and converts it to the correct type.
 * @param {goog.proto2.FieldDescriptor} field The field to decode.
 * @param {!Uint8Array} data The data stream to read from.
 * @return {*} The decoded value. 
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.decodeVarIntTypes =
        function(field, data) {
    var intVal = this.decodeVarInt(data);

    // We deserialize the value before checking the paramter to ensure that
    // remove the unknown value from the stream even if we can't work with it.
    if(!field) {
        return null;
    }

    var value;
    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.INT64:
    case goog.proto2.FieldDescriptor.FieldType.UINT64:
        value = intVal.toString();
        break;
    case goog.proto2.FieldDescriptor.FieldType.INT32:
    case goog.proto2.FieldDescriptor.FieldType.UINT32:
    case goog.proto2.FieldDescriptor.FieldType.ENUM:
        value = intVal;
        break;
    case goog.proto2.FieldDescriptor.FieldType.SINT32:
        var longint = goog.math.Long.fromNumber(intVal);
        value = this.zigZagDecode(longint).toInt();
        break;
    case goog.proto2.FieldDescriptor.FieldType.SINT64:
        var longint = goog.math.Long.fromNumber(intVal);
        value = this.zigZagDecode(longint).toString();
        break;
    case goog.proto2.FieldDescriptor.FieldType.BOOL:
        value = (intVal === 0 ? false : true);
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
        break;
    }

    return value;
}

/**
 * Deserializes length delimited fields.
 * @param {goog.proto2.FieldDescriptor} field The field to deserialize.
 * @param {!Uint8Array} data The data stream to read from.
 * @return {*} The decoded value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.decodeLengthDelimited =
        function(field, data) {

    var fieldLength = this.decodeVarInt(data);
    var fieldArray = new Uint8Array(data.buffer,
                                    data.byteOffset + this.deserializationIndex_,
                                    fieldLength);
    this.deserializationIndex_ += fieldLength;

    if(!field) {
        return null;
    }

    var value;
    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.STRING:
        value = UTF8ArrayToString(fieldArray);
        break;
    case goog.proto2.FieldDescriptor.FieldType.BYTES:
        value = UTF8ArrayToASCIIString(fieldArray);
        break;
    case goog.proto2.FieldDescriptor.FieldType.MESSAGE:
        var serializer = new goog.proto2.WireFormatSerializer();
        value = serializer.deserialize(field.getFieldMessageType(), fieldArray);
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
        break;
    }

    return value;
}

/**
 * Deserializes a 4 byte value from the stream.
 * @param {goog.proto2.FieldDescriptor} field The field to deserialize.
 * @param {!Uint8Array} data The data stream to read from.
 * @return {*} The decoded value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.decodeFixed32 = function(field, data) {
    var view = new DataView(data.buffer, data.byteOffset+this.deserializationIndex_, 4);
    this.deserializationIndex_ += 4;

    if(!field) {
        return null;
    }

    var value;
    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.FLOAT:
        value = view.getFloat32(0, true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.FIXED32:
        value = view.getUint32(0, true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.SFIXED32:
        value = view.getInt32(0, true);
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
    }
    
    return value;
}

/**
 * Deserializes a 8 byte value from the stream.
 * @param {goog.proto2.FieldDescriptor} field The field to deserialize.
 * @param {!Uint8Array} data The data stream to read from.
 * @return {*} The decoded value.
 * @protected
 */
goog.proto2.WireFormatSerializer.prototype.decodeFixed64 = function(field, data) {
    var view = new DataView(data.buffer, data.byteOffset+this.deserializationIndex_, 8);
    this.deserializationIndex_ += 8;

    if(!field) {
        return null;
    }

    var value;
    switch(field.getFieldType()) {
    case goog.proto2.FieldDescriptor.FieldType.DOUBLE:
        value = view.getFloat64(0, true);
        break;
    case goog.proto2.FieldDescriptor.FieldType.FIXED64:
        value = (new goog.math.Long(view.getUint32(0, true),
                                    view.getUint32(4, true))).toString();
        break;
    case goog.proto2.FieldDescriptor.FieldType.SFIXED64:
        value = (new goog.math.Long(view.getUint32(0, true),
                                    view.getInt32(4, true))).toString();
        break;
    default:
        this.badMessageFormat_("Unexpected field type");
    }
    
    return value;
}

/**
 * Maps field types to wire types.
 * @param {!number} fieldType The field type to map.
 * @return {!number} The wire type mapped to.
 * @protected
 */
goog.proto2.WireFormatSerializer.WireTypeForFieldType = function(fieldType) {
    return goog.proto2.WireFormatSerializer.kWireTypeForFieldType[fieldType];
}

/**
 * Wire format wire types.
 * Should mirror values in wire_format_lite.h
 * @enum {number}
 * @private
 */
goog.proto2.WireFormatSerializer.WireType = {
    VARINT:            0,
    FIXED64:           1,
    LENGTH_DELIMITED:  2,
    START_GROUP:       3,
    END_GROUP:         4,
    FIXED32:           5
};

/**
 * Maps field types to wire types
 * Should mirror value in wire_format_lite.cc
 * @type {Array.<number>}
 * @private
 */
goog.proto2.WireFormatSerializer.kWireTypeForFieldType = [
  -1,                                                          // invalid
  goog.proto2.WireFormatSerializer.WireType.FIXED64,           // DOUBLE
  goog.proto2.WireFormatSerializer.WireType.FIXED32,           // FLOAT
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // INT64
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // UINT64
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // INT32
  goog.proto2.WireFormatSerializer.WireType.FIXED64,           // FIXED64
  goog.proto2.WireFormatSerializer.WireType.FIXED32,           // FIXED32
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // BOOL
  goog.proto2.WireFormatSerializer.WireType.LENGTH_DELIMITED,  // STRING
  goog.proto2.WireFormatSerializer.WireType.START_GROUP,       // GROUP
  goog.proto2.WireFormatSerializer.WireType.LENGTH_DELIMITED,  // MESSAGE
  goog.proto2.WireFormatSerializer.WireType.LENGTH_DELIMITED,  // BYTES
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // UINT32
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // ENUM
  goog.proto2.WireFormatSerializer.WireType.FIXED32,           // SFIXED32
  goog.proto2.WireFormatSerializer.WireType.FIXED64,           // SFIXED64
  goog.proto2.WireFormatSerializer.WireType.VARINT,            // SINT32
  goog.proto2.WireFormatSerializer.WireType.VARINT             // SINT64
];
// Generated by CoffeeScript 1.6.2
var Connection, EmbeddedConnection, HttpConnection, TcpConnection, bufferConcat, bufferSlice,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

goog.provide("rethinkdb.net");

goog.require("rethinkdb.base");

goog.require("rethinkdb.cursor");

goog.require("VersionDummy");

goog.require("Query");

goog.require("goog.proto2.WireFormatSerializer");

Connection = (function() {
  var mkAtom, mkErr, mkSeq;

  Connection.prototype.DEFAULT_HOST = 'localhost';

  Connection.prototype.DEFAULT_PORT = 28015;

  function Connection(host, callback) {
    var _this = this;

    if (typeof host === 'undefined') {
      host = {};
    } else if (typeof host === 'string') {
      host = {
        host: host
      };
    }
    this.host = host.host || this.DEFAULT_HOST;
    this.port = host.port || this.DEFAULT_PORT;
    this.db = host.db;
    this.outstandingCallbacks = {};
    this.nextToken = 1;
    this.open = false;
    this.buffer = new ArrayBuffer(0);
    this._connect = function() {
      _this.open = true;
      _this._error = function() {};
      return callback(null, _this);
    };
    this._error = function() {
      return callback(new RqlDriverError("Could not connect to " + _this.host + ":" + _this.port + "."));
    };
  }

  Connection.prototype._data = function(buf) {
    var deserializer, response, responseArray, responseLength, responseLength2, _results;

    this.buffer = bufferConcat(this.buffer, buf);
    _results = [];
    while (this.buffer.byteLength >= 4) {
      responseLength = (new DataView(this.buffer)).getUint32(0, true);
      responseLength2 = (new DataView(this.buffer)).getUint32(0, true);
      if (!(this.buffer.byteLength >= (4 + responseLength))) {
        break;
      }
      responseArray = new Uint8Array(this.buffer, 4, responseLength);
      deserializer = new goog.proto2.WireFormatSerializer;
      response = deserializer.deserialize(Response.getDescriptor(), responseArray);
      this._processResponse(response);
      _results.push(this.buffer = bufferSlice(this.buffer, 4 + responseLength));
    }
    return _results;
  };

  Connection.prototype._end = function() {
    return this.close();
  };

  mkAtom = function(response) {
    return DatumTerm.prototype.deconstruct(response.getResponse(0));
  };

  mkSeq = function(response) {
    var res, _i, _len, _ref, _results;

    _ref = response.responseArray();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      res = _ref[_i];
      _results.push(DatumTerm.prototype.deconstruct(res));
    }
    return _results;
  };

  mkErr = function(ErrClass, response, root) {
    var bt, frame, msg;

    msg = mkAtom(response);
    bt = (function() {
      var _i, _len, _ref, _results;

      _ref = response.getBacktrace().framesArray();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        frame = _ref[_i];
        if (frame.getType() === Frame.FrameType.POS) {
          _results.push(parseInt(frame.getPos()));
        } else {
          _results.push(frame.getOpt());
        }
      }
      return _results;
    })();
    return new ErrClass(msg, root, bt);
  };

  Connection.prototype._delQuery = function(token) {
    var k;

    delete this.outstandingCallbacks[token];
    if (((function() {
      var _ref, _results;

      _ref = this.outstandingCallbacks;
      _results = [];
      for (k in _ref) {
        if (!__hasProp.call(_ref, k)) continue;
        _results.push(k);
      }
      return _results;
    }).call(this)).length < 1 && !this.open) {
      return this.cancel();
    }
  };

  Connection.prototype._processResponse = function(response) {
    var cb, cursor, root, token, _ref;

    token = response.getToken();
    _ref = this.outstandingCallbacks[token], cb = _ref.cb, root = _ref.root, cursor = _ref.cursor;
    if (cursor != null) {
      if (response.getType() === Response.ResponseType.SUCCESS_PARTIAL) {
        return cursor._addData(mkSeq(response));
      } else if (response.getType() === Response.ResponseType.SUCCESS_SEQUENCE) {
        cursor._endData(mkSeq(response));
        return this._delQuery(token);
      }
    } else if (cb) {
      if (response.getType() === Response.ResponseType.COMPILE_ERROR) {
        cb(mkErr(RqlCompileError, response, root));
        return this._delQuery(token);
      } else if (response.getType() === Response.ResponseType.CLIENT_ERROR) {
        cb(mkErr(RqlClientError, response, root));
        return this._delQuery(token);
      } else if (response.getType() === Response.ResponseType.RUNTIME_ERROR) {
        cb(mkErr(RqlRuntimeError, response, root));
        return this._delQuery(token);
      } else if (response.getType() === Response.ResponseType.SUCCESS_ATOM) {
        response = mkAtom(response);
        if (goog.isArray(response)) {
          response = ArrayResult.prototype.makeIterable(response);
        }
        cb(null, response);
        return this._delQuery(token);
      } else if (response.getType() === Response.ResponseType.SUCCESS_PARTIAL) {
        cursor = new Cursor(this, token);
        this.outstandingCallbacks[token].cursor = cursor;
        return cb(null, cursor._addData(mkSeq(response)));
      } else if (response.getType() === Response.ResponseType.SUCCESS_SEQUENCE) {
        cursor = new Cursor(this, token);
        this._delQuery(token);
        return cb(null, cursor._endData(mkSeq(response)));
      } else {
        return cb(new RqlDriverError("Unknown response type"));
      }
    } else {
      return this._error(new RqlDriverError("Unknown token in response"));
    }
  };

  Connection.prototype.close = ar(function() {
    return this.open = false;
  });

  Connection.prototype.cancel = ar(function() {
    this.outstandingCallbacks = {};
    return this.close();
  });

  Connection.prototype.reconnect = ar(function(callback) {
    this.cancel();
    return new this.constructor({
      host: this.host,
      port: this.port
    }, callback);
  });

  Connection.prototype.use = ar(function(db) {
    return this.db = db;
  });

  Connection.prototype._start = function(term, cb, useOutdated, noreply) {
    var pair, query, token;

    if (!this.open) {
      throw new RqlDriverError("Connection is closed.");
    }
    token = '' + this.nextToken;
    this.nextToken++;
    query = new Query;
    query.setType(Query.QueryType.START);
    query.setQuery(term.build());
    query.setToken(token);
    if (this.db != null) {
      pair = new Query.AssocPair();
      pair.setKey('db');
      pair.setVal((new Db({}, this.db)).build());
      query.addGlobalOptargs(pair);
    }
    if (useOutdated != null) {
      pair = new Query.AssocPair();
      pair.setKey('use_outdated');
      pair.setVal((new DatumTerm(!!useOutdated)).build());
      query.addGlobalOptargs(pair);
    }
    if (noreply != null) {
      pair = new Query.AssocPair();
      pair.setKey('noreply');
      pair.setVal((new DatumTerm(!!noreply)).build());
      query.addGlobalOptargs(pair);
    }
    if ((noreply == null) || !noreply) {
      this.outstandingCallbacks[token] = {
        cb: cb,
        root: term
      };
    }
    this._sendQuery(query);
    if ((noreply != null) && noreply) {
      return cb(null);
    }
  };

  Connection.prototype._continueQuery = function(token) {
    var query;

    query = new Query;
    query.setType(Query.QueryType.CONTINUE);
    query.setToken(token);
    return this._sendQuery(query);
  };

  Connection.prototype._endQuery = function(token) {
    var query;

    query = new Query;
    query.setType(Query.QueryType.STOP);
    query.setToken(token);
    return this._sendQuery(query);
  };

  Connection.prototype._sendQuery = function(query) {
    var data, finalArray, length, serializer;

    serializer = new goog.proto2.WireFormatSerializer;
    data = serializer.serialize(query);
    length = data.byteLength;
    finalArray = new Uint8Array(length + 4);
    (new DataView(finalArray.buffer)).setInt32(0, length, true);
    finalArray.set(data, 4);
    return this.write(finalArray.buffer);
  };

  return Connection;

})();

TcpConnection = (function(_super) {
  __extends(TcpConnection, _super);

  TcpConnection.isAvailable = function() {
    return typeof require !== 'undefined' && require('net');
  };

  function TcpConnection(host, callback) {
    var net,
      _this = this;

    if (!TcpConnection.isAvailable()) {
      throw new RqlDriverError("TCP sockets are not available in this environment");
    }
    TcpConnection.__super__.constructor.call(this, host, callback);
    if (this.rawSocket != null) {
      this.rawSocket.end();
    }
    net = require('net');
    this.rawSocket = net.connect(this.port, this.host);
    this.rawSocket.setNoDelay();
    this.rawSocket.on('connect', function() {
      var buf;

      buf = new ArrayBuffer(4);
      (new DataView(buf)).setUint32(0, VersionDummy.Version.V0_1, true);
      _this.write(buf);
      return _this._connect();
    });
    this.rawSocket.on('error', function() {
      return _this._error();
    });
    this.rawSocket.on('end', function() {
      return _this._end();
    });
    this.rawSocket.on('data', function(buf) {
      var arr, byte, i, _i, _len;

      arr = new Uint8Array(new ArrayBuffer(buf.length));
      for (i = _i = 0, _len = buf.length; _i < _len; i = ++_i) {
        byte = buf[i];
        arr[i] = byte;
      }
      return _this._data(arr.buffer);
    });
    this.rawSocket.on('close', function() {
      return _this.close();
    });
  }

  TcpConnection.prototype.close = function() {
    this.rawSocket.end();
    return TcpConnection.__super__.close.call(this);
  };

  TcpConnection.prototype.cancel = function() {
    this.rawSocket.destroy();
    return TcpConnection.__super__.cancel.call(this);
  };

  TcpConnection.prototype.write = function(chunk) {
    var buf, byte, i, _i, _len, _ref;

    buf = new Buffer(chunk.byteLength);
    _ref = new Uint8Array(chunk);
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      byte = _ref[i];
      buf[i] = byte;
    }
    return this.rawSocket.write(buf);
  };

  return TcpConnection;

})(Connection);

HttpConnection = (function(_super) {
  __extends(HttpConnection, _super);

  HttpConnection.prototype.DEFAULT_PROTOCOL = 'http';

  HttpConnection.isAvailable = function() {
    return typeof XMLHttpRequest !== "undefined";
  };

  function HttpConnection(host, callback) {
    var protocol, url, xhr,
      _this = this;

    if (!HttpConnection.isAvailable()) {
      throw new RqlDriverError("XMLHttpRequest is not available in this environment");
    }
    HttpConnection.__super__.constructor.call(this, host, callback);
    protocol = host.protocol === 'https' ? 'https' : this.DEFAULT_PROTOCOL;
    url = "" + protocol + "://" + this.host + ":" + this.port + "/ajax/reql/";
    xhr = new XMLHttpRequest;
    xhr.open("GET", url + "open-new-connection", true);
    xhr.responseType = "arraybuffer";
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          _this._url = url;
          _this._connId = (new DataView(xhr.response)).getInt32(0, true);
          return _this._connect();
        } else {
          return _this._error();
        }
      }
    };
    xhr.send();
  }

  HttpConnection.prototype.cancel = function() {
    var xhr;

    xhr = new XMLHttpRequest;
    xhr.open("POST", "" + this._url + "close-connection?conn_id=" + this._connId, true);
    xhr.send();
    this._url = null;
    this._connId = null;
    return HttpConnection.__super__.cancel.call(this);
  };

  HttpConnection.prototype.write = function(chunk) {
    var xhr,
      _this = this;

    xhr = new XMLHttpRequest;
    xhr.open("POST", "" + this._url + "?conn_id=" + this._connId, true);
    xhr.responseType = "arraybuffer";
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4 && xhr.status === 200) {
        return _this._data(xhr.response);
      }
    };
    return xhr.send(chunk);
  };

  return HttpConnection;

})(Connection);

EmbeddedConnection = (function(_super) {
  __extends(EmbeddedConnection, _super);

  EmbeddedConnection.isAvailable = function() {
    return typeof RDBPbServer !== "undefined";
  };

  function EmbeddedConnection(embeddedServer, callback) {
    EmbeddedConnection.__super__.constructor.call(this, {}, callback);
    this._embeddedServer = embeddedServer;
    this._connect();
  }

  EmbeddedConnection.prototype.write = function(chunk) {
    return this._data(this._embeddedServer.execute(chunk));
  };

  return EmbeddedConnection;

})(Connection);

rethinkdb.connect = ar(function(host, callback) {
  if (!(typeof host === 'string' || typeof host === 'object')) {
    throw new RqlDriverError("First argument to `connect` must be a string giving the " + "host to `connect` to or an object giving `host` and `port`.");
  }
  if (typeof callback !== 'function') {
    throw new RqlDriverError("Second argument to `connect` must be a callback to invoke with " + "either an error or the successfully established connection.");
  }
  if (TcpConnection.isAvailable()) {
    new TcpConnection(host, callback);
  } else if (HttpConnection.isAvailable()) {
    new HttpConnection(host, callback);
  } else {
    throw new RqlDriverError("Neither TCP nor HTTP avaiable in this environment");
  }
});

rethinkdb.embeddedConnect = ar(function(callback) {
  if (callback == null) {
    callback = (function() {});
  }
  if (!EmbeddedConnection.isAvailable()) {
    throw new RqlDriverError("Embedded connection not available in this environment");
  }
  return new EmbeddedConnection(new RDBPbServer, callback);
});

bufferConcat = function(buf1, buf2) {
  var view;

  view = new Uint8Array(buf1.byteLength + buf2.byteLength);
  view.set(new Uint8Array(buf1), 0);
  view.set(new Uint8Array(buf2), buf1.byteLength);
  return view.buffer;
};

bufferSlice = function(buffer, offset) {
  var res, residual;

  if (offset > buffer.byteLength) {
    offset = buffer.byteLength;
  }
  residual = buffer.byteLength - offset;
  res = new Uint8Array(residual);
  res.set(new Uint8Array(buffer, offset));
  return res.buffer;
};
// Generated by CoffeeScript 1.6.2
goog.provide("rethinkdb.root");

goog.require("rethinkdb.base");

goog.require("rethinkdb.errors");

goog.require("rethinkdb.query");

goog.require("rethinkdb.net");

if (typeof module !== 'undefined' && module.exports) {
  module.exports = rethinkdb;
}
