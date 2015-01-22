// init_ui.js
// 2012-05-09

// This is the web browser companion to fulljslint.js. It is an ADsafe
// lib file that implements a web ui by adding behavior to the widget's
// html tags.

// It stores a function in lib.init_ui. Calling that function will
// start up the JSLint widget ui.

// option = {adsafe: true, fragment: false}

/*properties
    cookie, each, edition, forEach, get, getStyle, getTitle, getValue,
    indent, isArray, join, jslint, keys, klass, length, lib, maxerr, maxlen, on,
    predef, preventDefault, push, q, select, set, split, style, target, value
*/
//SD Turn off various JSLint warnings
/*jslint white:true, ass:true*/
/*globals ADSAFE, cm, $, toggleCMLint, toggleCMTabs, selectTheme, updateCommentBlankLines, Storage, localStorage */
/*properties
    cmOptions, setOption, options, useJSLint, saveSettings, doc, setValue, focus,
    ready, prop, find, text, filter,
    enableCMLint, showInline, showTabs, lineNumbers, showTrailingSpace, styleActiveLine,
    autoCloseBrackets, useSpaceNotTab, commentBlankLines, theme,
    match, exec
*/

ADSAFE.lib("init_ui", function (lib) {
    'use strict';
    var HTML5STORE_KEY = 'JSLint3 text'; //key for storing source code across sessions in HTML5 Storage

    return function (dom) {
        var edition = dom.q('#JSLINT_EDITION'),
            errors = dom.q('#JSLINT_ERRORS'),
            errors_div = errors.q('>div'),
            indent = dom.q('#JSLINT_INDENT'),
            jslint_dir = dom.q('#JSLINT_JSLINT'),
            jslint_str = jslint_dir.q('>textarea'),
            maxerr = dom.q('#JSLINT_MAXERR'),
            maxlen = dom.q('#JSLINT_MAXLEN'),
            option = lib.cookie.get(),
            options = dom.q('#JSLINT_OPTIONS'),
            predefined = dom.q('#JSLINT_PREDEF'),
            properties = dom.q('#JSLINT_PROPERTIES'),
            properties_str = properties.q('>textarea'),
            report = dom.q('#JSLINT_REPORT'),
            report_div = report.q('>div'),
            source = dom.q('#JSLINT_SOURCE'),
            source_str = source.q('>textarea'),
            tristate = {};


        //SD: Passes JSLint options to CodeMirror's JSLint
        function setOptionsAndLintNow(option)
        {
            lib.cmOptions = option.cmOptions; //expose for CodeMirror initialization use
            if (cm)
            {
                cm.setOption('jslintOptions', {
                    'options': option,
                    'useJSLint': !$('#cbUseJSHint').prop('checked')
                });
                updateCommentBlankLines();
            }
            else
            {
                //this will happen upon initial page load.
                $(cm).ready(function() {
                    toggleCMLint();
                    toggleCMTabs();
                    cm.setOption('lineNumbers', !!($('#cbShowLineNumbers').prop('checked')));
                    cm.setOption('showTrailingSpace', !!($('#cbShowTrailingSpace').prop('checked')));
                    cm.setOption('styleActiveLine', !!($('#cbStyleActiveLine').prop('checked')));
                    cm.setOption('autoCloseBrackets', !!($('#cbAutoCloseBrackets').prop('checked')));
                    selectTheme();
                    //SD: Restores saved text in HTML5 Storage to editor.
                    if (typeof Storage !== 'undefined')
                    {
                        var text = localStorage[HTML5STORE_KEY];
                        if (typeof text === 'string')
                        {
                            cm.setValue(text);
                        }
                    }
                    setOptionsAndLintNow(option);
                });
            }
        }

        function clear() {
            errors.style('display', 'none');
            report.style('display', 'none');
            properties.style('display', 'none');
            errors_div.value('');
            report_div.value('');
            properties_str.value('');
            source_str.select('');
        }

        function clear_all() {
            source_str.value('');
            clear();
            if (cm)
            {
                cm.doc.setValue('');
                cm.focus();
            }
            //SD: Clear any saved text in HTML5 Storage.
            if (typeof Storage !== 'undefined')
            {
                localStorage.removeItem(HTML5STORE_KEY);
            }
        }

        function preventDefault(e) {
            return e.preventDefault();
        }

        function show_jslint_directive() {

// Build and display a /*jslint*/ control comment.
// The comment can be copied into a .js file.

            var a = [], result;

            ADSAFE.keys(tristate).forEach(function (title) {
                var value = ADSAFE.get(option, title);
                if (typeof value === 'boolean') {
                    a.push(title + ': ' + String(value));
                }
            });
            if (typeof option.indent === 'number' && option.indent >= 0) {
                a.push('indent: ' + String(option.indent));
            }
            if (typeof option.maxerr === 'number' && option.maxerr >= 0) {
                a.push('maxerr: ' + String(option.maxerr));
            }
            if (typeof option.maxlen === 'number' && option.maxlen >= 0) {
                a.push('maxlen: ' + String(option.maxlen));
            }
            result = '/*jslint ' + a.join(', ') + ' */';
            jslint_str.value(result);
            jslint_dir.style('display', result.length > 12 ? 'block' : 'none');

            //SD: save CodeMirror settings to cookie
            option.cmOptions.enableCMLint = $('#cbEnableCMLint').prop('checked');
            option.cmOptions.showInline = $('#cbShowInline').prop('checked');
            option.cmOptions.useJSLint = !$('#cbUseJSHint').prop('checked');
            option.cmOptions.showTabs = $('#cbShowTabs').prop('checked');
            option.cmOptions.lineNumbers = $('#cbShowLineNumbers').prop('checked');
            option.cmOptions.showTrailingSpace = $('#cbShowTrailingSpace').prop('checked');
            option.cmOptions.styleActiveLine = $('#cbStyleActiveLine').prop('checked');
            option.cmOptions.autoCloseBrackets = $('#cbAutoCloseBrackets').prop('checked');
            option.cmOptions.useSpaceNotTab = $('#cbUseSpaceNotTab').prop('checked');
            option.cmOptions.commentBlankLines = $('#cbCommentBlankLines').prop('checked');
            option.cmOptions.theme = $('#selTheme').find('option:selected').text();

// Make a JSON cookie of the option object.

            lib.cookie.set(option);
            setOptionsAndLintNow(option); //SD: Pass JSLint options to CodeMirror editor
        }
        lib.saveSettings = show_jslint_directive; //SD: expose for use in our CodeMirror options

        function wire_tristate(bunch) {
            bunch.each(function (b) {
                var title = b.getTitle(),
                    dfn = b.q('>button'),
                    label = b.q('>var');
                ADSAFE.set(tristate, title, label);

                function mouseover(e) {
                    dfn.style('backgroundColor', 'cornflowerblue');
                    e.preventDefault();
                }

                function mouseout() {
                    dfn.style('backgroundColor', 'lightsteelblue');
                }

                function mousedown() {
                    dfn.style('backgroundColor', 'steelblue');
                }

                function click() {
                    var state = ADSAFE.get(option, title);
                    if (state === true) {
                        ADSAFE.set(option, title, false);
                        label
                            .value('false')
                            .klass('false');
                    } else if (state === false) {
                        ADSAFE.set(option, title, undefined);
                        label
                            .value('default')
                            .klass('');
                    } else {
                        ADSAFE.set(option, title, true);
                        label
                            .value('true')
                            .klass('true');
                    }
                    show_jslint_directive();
                }

                dfn
                    .on('mouseover', mouseover)
                    .on('mouseout', mouseout)
                    .on('mousedown', mousedown)
                    .on('mouseup', mouseover)
                    .on('mousemove', preventDefault)
                    .on('click', click);
                label
                    .on('mouseover', mouseover)
                    .on('mouseout', mouseout)
                    .on('mousedown', mousedown)
                    .on('mouseup', mouseover)
                    .on('mousemove', preventDefault)
                    .on('click', click);
                mouseout();
            });
        }


        function show_options() {
            indent.value(String(option.indent || ''));
            maxlen.value(String(option.maxlen || ''));
            maxerr.value(String(option.maxerr || ''));
            predefined.value(ADSAFE.isArray(option.predef)
                ? option.predef.join(' ')
                : '');
            ADSAFE.keys(tristate).forEach(function (title) {
                var value = ADSAFE.get(option, title);
                if (typeof value === 'boolean') {
                    ADSAFE.get(tristate, title)
                        .klass(String(value))
                        .value(String(value));
                } else {
                    ADSAFE.get(tristate, title)
                        .klass('')
                        .value('default');
                }
            });

            //SD: restore CodeMirror settings from cookie
            $('#cbEnableCMLint').prop('checked', option.cmOptions.enableCMLint);
            $('#cbShowInline').prop('checked', option.cmOptions.showInline);
            $('#cbUseJSHint').prop('checked', !option.cmOptions.useJSLint);
            $('#cbShowTabs').prop('checked', option.cmOptions.showTabs);
            $('#cbShowLineNumbers').prop('checked', option.cmOptions.lineNumbers);
            $('#cbShowTrailingSpace').prop('checked', option.cmOptions.showTrailingSpace);
            $('#cbStyleActiveLine').prop('checked', option.cmOptions.styleActiveLine);
            $('#cbAutoCloseBrackets').prop('checked', option.cmOptions.autoCloseBrackets);
            $('#cbUseSpaceNotTab').prop('checked', option.cmOptions.useSpaceNotTab);
            $('#cbCommentBlankLines').prop('checked', option.cmOptions.commentBlankLines);
            $('#selTheme option').filter(function() {
                return $(this).text() === option.cmOptions.theme;
            }).prop('selected', true);

            show_jslint_directive();
        }

        function clear_options() {
            option = {};
            show_options();
        }

        function update_number(event) {
            var value = event.target.getValue();
            if (value.length === 0 || +value < 0 || !isFinite(value)) {
                value = '';
                ADSAFE.set(option, event.target.getTitle(), '');
            } else {
                ADSAFE.set(option, event.target.getTitle(), +value);
            }
            event.target.value(String(value));
            show_jslint_directive();
        }

        function update_list(event) {
            var value = event.target.getValue().split(/[\s,;'"]+/);
            ADSAFE.set(option, event.target.getTitle(), value);
            event.target.value(value.join(' '));
            show_jslint_directive();
        }


// Restore the options from a JSON cookie.

        if (!option || typeof option !== 'object') {
            option = {};
        }
        //SD: Add our CodeMirror options to cookie
        if (!option.cmOptions || (typeof option.cmOptions !== 'object'))
        {
            option.cmOptions = {
                enableCMLint: true,
                showInline: true,
                useJSLint: true,
                showTabs: true,
                lineNumbers: true,
                showTrailingSpace: true,
                styleActiveLine: true,
                autoCloseBrackets: true,
                useSpaceNotTab: true,
                commentBlankLines: true,
                theme: 'blackboard'
            };
        }
        wire_tristate(options.q('div.tristate>div[title]'));
        source.q('>button').on('click', clear_all);
        dom.q('#JSLINT_BUTTON').on('click', function () {
            clear();
            //SD: Retrieve source code from CodeMirror editor instead
            // insert jump-to links in errors list
            //if (lib.jslint(source_str.getValue(), option,
            /*jslint nomen:true*/
            /*properties ___nodes___, innerHTML, replace*/

            var text = cm.getValue(), r, m, t;
            //detect html text and try to extract scripts from it!
            if (text.match(/^\s*<(!DOCTYPE\s+)?\s*html[^\w]/i))
            {
                //r = new RegExp(/<\s*script(?:.*?(src\s*=\s*.*?))*.*?>([^]*?)<\/\s*script\s*>/img);
                r = new RegExp(/<\s*script(?:.*?(src\s*=\s*.*?))*.*?>((?:\w|\W)*?)<\/\s*script\s*>/img);
                t = '';
                while ((m = r.exec(text)) !== null)
                {
                    if (m && !m[1] && m[2] && (m[2].length > 0))
                    {
                        t += m[2] + '\n////////\n'; //concatenate scripts with line break (and comment marker)
                    }
                }
                text = t;
                cm.setValue(text); //save extracted scripts back to editor
            }

            //SD: Saves text in editor to HTML5 Storage.
            if (typeof Storage !== 'undefined')
            {
                localStorage[HTML5STORE_KEY] = text;
            }

            //Proceed with lint
            if (lib.jslint(text, option,
                errors_div, report_div, properties_str, edition))
            {
                errors_div.___nodes___[0].innerHTML = errors_div.___nodes___[0].innerHTML.replace(
                    /<address>(line\s+(\d+)\s+character\s+(\d+))<\/address>/g,
                    "<address><a href='' onclick='scrollToCode($2,$3); return false;'>$1<\/a><\/address>");
                errors.style('display', 'block');
            }
            report_div.___nodes___[0].innerHTML = report_div.___nodes___[0].innerHTML.replace(
                /<address>(line\s+(\d+))<\/address>/g,
                "<address><a href='' onclick='scrollToCode($2,0); return false;'>$1<\/a><\/address>");
            /*jslint nomen:false*/
            report.style('display', 'block');
            if (properties_str.getValue().length > 21) {
                properties.style('display', 'block');
            }
            source_str.select();
            setOptionsAndLintNow(option); //SD: Let CodeMirror editor update its' lint too!
            return false;
        });
        errors.q('>button').on('click', clear);
        report.q('>button').on('click', clear);
        properties.q('>button').on('click', function () {
            properties_str.select();
        });
        options.q('>button').on('click', clear_options);
        jslint_dir.q('>button').on('click', function () {
            jslint_str.select();
        });
        clear();
        show_options();

// Display the edition.

        edition.value('Edition ' + lib.edition());

        indent.on('change', update_number);
        maxerr.on('change', update_number);
        maxlen.on('change', update_number);
        predefined.on('change', update_list);
    };
});
