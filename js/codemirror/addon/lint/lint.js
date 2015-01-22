// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

/**
 * SD: Modified to add inline style of presenting lint issues.
 *   Original example from http://codemirror.net/demo/widget.html
 *   Its icon style has been updated to lint.js', which is nicer, more informative.
 **/
//JSLint static code analysis options
/*jslint browser:true, ass:true, nomen:true, sloppy:true, plusplus:true, ass:true, indent:4, white:true, continue:true */
/*global CodeMirror:true, alert:true*/

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";
    var GUTTER_ID = "CodeMirror-lint-markers";

    function showTooltip(e, content) {
        var tt = document.createElement("div");
        tt.className = "CodeMirror-lint-tooltip";
        tt.appendChild(content.cloneNode(true));
        document.body.appendChild(tt);

        function position(e) {
            if (!tt.parentNode)
            {
                return CodeMirror.off(document, "mousemove", position);
            }
            tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5) + "px";
            tt.style.left = (e.clientX + 5) + "px";
        }
        CodeMirror.on(document, "mousemove", position);
        position(e);
        if (tt.style.opacity !== null)
		{
			tt.style.opacity = 1;
		}
        return tt;
    }

    function rm(elt) {
        if (elt.parentNode)
        {
            elt.parentNode.removeChild(elt);
        }
    }

    function hideTooltip(tt) {
        if (!tt.parentNode)
        {
            return;
        }
        if (tt.style.opacity === null)
        {
            rm(tt);
        }
        tt.style.opacity = 0;
        setTimeout(function() { rm(tt); }, 600);
    }

    function annotationTooltip(ann) {
        var severity = ann.severity, tip;
        if (!severity)
        {
            severity = "error";
        }
        tip = document.createElement("div");
        tip.className = "CodeMirror-lint-message-" + severity;
        tip.appendChild(document.createTextNode(ann.message));
        return tip;
    }

    function showTooltipFor(e, content, node) {
        var tooltip = showTooltip(e, content), poll;
        function hide() {
            CodeMirror.off(node, "mouseout", hide);
            if (tooltip) { hideTooltip(tooltip); tooltip = null; }
        }
        poll = setInterval(function() {
            if (tooltip)
            {
                var n;
                for (n = node;; n = n.parentNode) {
                    if (n === document.body)
                    {
                        return;
                    }
                    if (!n) { hide(); break; }
                }
            }
            if (!tooltip)
            {
                return clearInterval(poll);
            }
        }, 400);
        CodeMirror.on(node, "mouseout", hide);
    }

    function popupSpanTooltip(ann, e) {
        var target = e.target || e.srcElement;
        showTooltipFor(e, annotationTooltip(ann), target);
    }

    function onMouseOver(cm, e) {
    	var target = e.target || e.srcElement,
            box, x, y, spans, i, ann;
    	if (!/\bCodeMirror-lint-mark-/.test(target.className))
        {
            return;
        }
    	box = target.getBoundingClientRect();
        x = (box.left + box.right) / 2;
        y = (box.top + box.bottom) / 2;
    	spans = cm.findMarksAt(cm.coordsChar({left: x, top: y}, "client"));
   		for (i = 0; i < spans.length; ++i)
        {
      		ann = spans[i].__annotation;
      		if (ann)
            {
                return popupSpanTooltip(ann, e);
            }
		}
    }

    function LintState(cm, options, hasGutter) {
        this.marked = [];
        this.options = options;
        this.timeout = null;
        this.hasGutter = hasGutter;
        this.onMouseOver = function(e) { onMouseOver(cm, e); };
    }

    function parseOptions(cm, options) {
        if (options instanceof Function)
        {
            return {getAnnotations: options};
        }
        if (!options || (options === true))
		{
			options = {};
		}
		if (!options.getAnnotations)
        {
			options.getAnnotations = cm.getHelper(CodeMirror.Pos(0, 0), "lint");
		}
		if (!options.getAnnotations)
        {
            throw new Error("Required option 'getAnnotations' missing (lint addon)");
        }
        return options;
    }

    function clearMarks(cm) {
        var state = cm.state.lint, i;
		if (!state)
		{
			return;
		}
        if (state.options && !state.options.showInline)
        {
            if (state.hasGutter)
            {
                cm.clearGutter(GUTTER_ID);
            }
            for (i = 0; i < state.marked.length; ++i)
            {
                state.marked[i].clear();
            }
            state.marked.length = 0;
        }
        else
        {
            //SD: Alt visualization
            for (i = 0; i < state.marked.length; ++i)
            {
                cm.removeLineWidget(state.marked[i]);
            }
            state.marked.length = 0;
        }
    }

    function makeMarker(labels, severity, multiple, tooltips) {
        var marker = document.createElement("div"), inner = marker;
        marker.className = "CodeMirror-lint-marker-" + severity;
        if (multiple)
        {
            inner = marker.appendChild(document.createElement("div"));
            inner.className = "CodeMirror-lint-marker-multiple";
        }

        if (tooltips !== false)
        {
            CodeMirror.on(inner, "mouseover", function(e) {
            	showTooltipFor(e, labels, inner);
            });
        }

        return marker;
    }

    function getMaxSeverity(a, b) {
        if (a === "error")
        {
            return a;
        }
        return b;
    }

    function groupByLine(annotations) {
        var lines = [], i, ann, line;
        for (i = 0; i < annotations.length; ++i)
        {
            ann = annotations[i];
            line = ann.from.line;
            (lines[line] || (lines[line] = [])).push(ann);
        }
        return lines;
    }

    function updateLinting(cm, annotationsNotSorted) {
        clearMarks(cm);
        var state = cm.state.lint, options = state.options,
            annotations = groupByLine(annotationsNotSorted),
            line, anns, maxSeverity, tipLabel,
            i, ann, severity, m, msg, icon;

        for (line = 0; line < annotations.length; ++line)
        {
            anns = annotations[line];
            if (!anns)
            {
                continue;
            }
            maxSeverity = null;
            tipLabel = state.hasGutter && document.createDocumentFragment();

            for (i = 0; i < anns.length; ++i)
            {
                ann = anns[i];
                severity = ann.severity;
                if (!severity)
                {
                    severity = "error";
                }
                maxSeverity = getMaxSeverity(maxSeverity, severity);

                if (!options.showInline)
                {
                    if (options.formatAnnotation)
                    {
                        ann = options.formatAnnotation(ann);
                    }
                    if (state.hasGutter)
                    {
                        tipLabel.appendChild(annotationTooltip(ann));
                    }

                    if (ann.to)
                    {
                        state.marked.push(m = cm.markText(ann.from, ann.to, {
                            className: "CodeMirror-lint-mark-" + severity,
                            __annotation: ann
                        }));
                        m.issuePos = ann.from; //save issue position for jumps
                    }
                }
                else
                {
                    //SD: Alt visualization
                    msg = document.createElement("div");
                    /* //original style
                    <style>
                    .lint-error-icon {color: white; background-color: red; font-weight: bold; border-radius: 50%; padding: 0 3px; margin-right: 7px;}
                    </style>
                    var icon = msg.appendChild(document.createElement("span"));
                    icon.innerHTML = (maxSeverity === "error")? "X": "!!";
                    icon.className = "lint-error-icon";
                    */
                    icon = makeMarker('', maxSeverity, false, true);
                    msg.appendChild(icon);
                    msg.appendChild(document.createTextNode(ann.message));
                    msg.className = "CodeMirror-lint-message-error-inline";
                    state.marked.push(m = cm.addLineWidget(ann.from.line, msg, {coverGutter: false, noHScroll: true}));
                    m.issuePos = ann.from; //save issue position for jumps
                }
            } //end for each annotation/issue

            if (!options.showInline && state.hasGutter)
            {
                cm.setGutterMarker(line, GUTTER_ID, makeMarker(tipLabel, maxSeverity, anns.length > 1, state.options.tooltips));
            }
        }
    	if (options.onUpdateLinting)
		{
			options.onUpdateLinting(annotationsNotSorted, annotations, cm);
		}
    }

    function startLinting(cm) {
        var state = cm.state.lint, options;
        if (!state) //SD: Guard against premature calls by javascript-lint
        {
            return;
        }
        options = state.options;
        if (options.getAnnotations)
        {
            if (options.async)
            {
                options.getAnnotations(cm, updateLinting, options);
            }
            else
            {
                updateLinting(cm, options.getAnnotations(cm.getValue(), options));
            }
        }
    }


    //SD: add method for us to trigger linting externally
    CodeMirror.doLint = function(cm)
    {
        startLinting(cm);
    };


    function onChange(cm) {
        var state = cm.state.lint;
        if (state)
        {
            clearTimeout(state.timeout);
            state.timeout = setTimeout(function(){startLinting(cm);}, state.options.delay || 500);
        }
    }

    function optionHandler(cm, val, old) {
        if (old && (old !== CodeMirror.Init))
        {
            clearMarks(cm);
            cm.off("change", onChange);
            CodeMirror.off(cm.getWrapperElement(), "mouseover", cm.state.lint.onMouseOver);
            delete cm.state.lint;
        }

        if (val) {
            var gutters = cm.getOption("gutters"), hasLintGutter = false,
                i, state;
            for (i = 0; i < gutters.length; ++i)
            {
                if (gutters[i] === GUTTER_ID)
                {
                    hasLintGutter = true;
                }
            }
            state = cm.state.lint = new LintState(cm, parseOptions(cm, val), hasLintGutter);
            cm.on("change", onChange);
            if (state.options.tooltips !== false)
			{
				CodeMirror.on(cm.getWrapperElement(), "mouseover", state.onMouseOver);
			}
            startLinting(cm);
        }
    }
	CodeMirror.defineOption("lintWith", false, optionHandler); // deprecated
	CodeMirror.defineOption("lint", false, optionHandler); // deprecated

    //SD: Add commands (for keyboard shortcuts) to find/jump to next/previous issue.
    function nextIssue(cm)
    {
        var curPos = cm.getCursor(),
            state = cm.state.lint,
            i, cnt = state.marked.length || 0,
            m;
        if (cnt > 0)
        {
            for (i = 0; i < cnt; ++i)
            {
                m = state.marked[i];
                if (m.issuePos.line > curPos.line)
                {
                    cm.scrollIntoView(m.issuePos.line + 5, 0);
                    cm.doc.setCursor(m.issuePos.line, m.issuePos.ch);
                    return;
                }
            }
            //wrap around to first issue
            m = state.marked[0];
            cm.scrollIntoView(m.issuePos.line + 5, 0);
            cm.doc.setCursor(m.issuePos.line, m.issuePos.ch);
        }
        else
        {
            alert('Quality codes! No lint issues found.');
        }
    }

    function previousIssue(cm)
    {
        var curPos = cm.getCursor(),
            state = cm.state.lint,
            i, max = state.marked.length - 1,
            m;
        if (max >= 0)
        {
            for (i = max; i >= 0; --i)
            {
                m = state.marked[i];
                if (m.issuePos.line < curPos.line)
                {
                    cm.scrollIntoView(m.issuePos.line + 5, 0);
                    cm.doc.setCursor(m.issuePos.line, m.issuePos.ch);
                    return;
                }
            }
            //wrap around to last issue
            m = state.marked[max];
            cm.scrollIntoView(m.issuePos.line + 5, 0);
            cm.doc.setCursor(m.issuePos.line, m.issuePos.ch);
        }
        else
        {
            alert('Quality codes! No lint issues found.');
        }
    }

  CodeMirror.commands.NextIssue = function(cm) { nextIssue(cm); };
  CodeMirror.commands.PreviousIssue = function(cm) { previousIssue(cm); };
});
