/**
 * Provide bookmarking service in CodeMirror.
 * @author DS
 **/
//JSLint static code analysis options
/*jslint browser: true, nomen:true, sloppy: true, plusplus: true, indent: 4, white: true, ass: true */
/*global CodeMirror */

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    function BookmarksState() {
        this.sorted = [];
    }

    function makeMarker(line) {
        var marker = document.createElement("div");
        marker.innerHTML = "\u25B6"; //use right pointing triangular arrow head instead of greater-than sign, "&gt;";
        marker.className = "bookmark";
        marker.line = line;
        return marker;
    }

    //
    // Manage bookmarks
    //
    function clearAllBookmarks(cm) {
        var state = cm._bookmarksState,
            i, cnt = state.sorted.length,
            bmPos;
        for (i = 0; i < cnt; ++i)
        {
            bmPos = state.sorted[i].find();
            if (bmPos !== undefined)
            {
                cm.setGutterMarker(bmPos.line, "bookmarks", null);
                state.sorted[i].clear();
            }
        }
        state.sorted.length = 0;
    }
/*
    function refreshAllBookmarkGutters(cm) {
        var state = cm._bookmarksState,
            i, cnt = state.sorted.length,
            bmPos, line;
        for (i = 0; i < cnt; ++i)
        {
            cm.setGutterMarker(state.sorted[i], "bookmarks", null);
            bmPos = state.sorted[i].find();
            if (bmPos !== undefined)
            {
                line = bmPos.line;
                cm.setGutterMarker(line, "bookmarks", makeMarker(line));
            }
        }
    }
*/
    function compareNumericAscending(a, b)
    {
        a = a.find();
        b = b.find();
        return ((a === undefined) || (b === undefined))? 1: (a.line - b.line);
    }

    function findBookmark(bookmarks, mark)
    {
        var cnt = bookmarks.length, i;
        for (i = 0; i < cnt; ++i)
        {
            if (bookmarks[i] === mark)
            {
                return i;
            }
        }
        return -1;
    }

    function onMove(mark) {
        var bmPos = mark.find(), curLine;
        if (bmPos)
        {
            curLine = bmPos.line;
            mark.doc.cm.setGutterMarker(curLine, "bookmarks", makeMarker(curLine));
        }
    }

    function onHide(bookmark) {
        var state = bookmark.doc.cm._bookmarksState,
            index = findBookmark(state.sorted, bookmark);
        if (index !== undefined)
        {
            state.sorted.splice(index, 1)[0].clear();
        }
    }

    function findBookmarkForLine(bookmarks, line)
    {
        var cnt = bookmarks.length, i;
        for (i = 0; i < cnt; ++i)
        {
            if (bookmarks[i].find().line === line)
            {
                return i;
            }
        }
        return -1;
    }

    function toggleBookmark(cm)
    {
        var curLine = cm.getCursor().line,
            info = cm.lineInfo(curLine),
            state = cm._bookmarksState, m;
        if (state === undefined)
        {
            cm._bookmarksState = state = new BookmarksState();
        }
        if (!info.gutterMarkers || !info.gutterMarkers.bookmarks)
        {
            //add bookmark
            state.sorted.push(m = cm.setBookmark({line: curLine, ch: 0}));
            CodeMirror.on(m, "hide", onHide);
            CodeMirror.on(m, "moved", onMove);
            state.sorted.sort(compareNumericAscending);
            cm.setGutterMarker(curLine, "bookmarks", makeMarker(curLine));
        }
        else
        {
            //remove bookmark
            m = findBookmarkForLine(state.sorted, curLine);
            if (m >= 0)
            {
                state.sorted.splice(m, 1)[0].clear();
                cm.setGutterMarker(curLine, "bookmarks", null);
            }
        }
    }

    function nextBookmark(cm)
    {
        var curLine = cm.getCursor().line,
            state = cm._bookmarksState,
            i, cnt, bmPos, bmLine;
        if (state === undefined)
        {
            return;
        }
        cnt = state.sorted.length || 0;
        if (cnt > 0) 
        {
            for (i = 0; i < cnt; ++i)
            {
                bmPos = state.sorted[i].find();
                if (bmPos !== undefined)
                {
                    bmLine = bmPos.line;
                    if (bmLine > curLine)
                    {
                        cm.scrollIntoView(bmLine + 5, 0);
                        cm.doc.setCursor(bmLine, 0);
                        return;
                    }
                }
                else
                {
                    //remove deleted bookmark
                    state.sorted.splice(i, 1);
                    --i;
                    --cnt;
                }
            }
            if (cnt > 0) //check again as all bookmarks may have been deleted!
            {
                //wrap around to first issue
                bmLine = state.sorted[0].find().line;
                cm.scrollIntoView(bmLine + 5, 0);
                cm.doc.setCursor(bmLine, 0);
            }
        }
    }

    function previousBookmark(cm)
    {
        var curLine = cm.getCursor().line,
            state = cm._bookmarksState,
            i, max, bmPos, bmLine;
        if (state === undefined)
        {
            return;
        }
        max = state.sorted.length - 1;
        if (max >= 0) 
        {
            for (i = max; i >= 0; --i)
            {
                bmPos = state.sorted[i].find();
                bmLine = bmPos.line;
                if (bmPos !== undefined)
                {
                    if (bmLine < curLine)
                    {
                        cm.scrollIntoView(bmLine + 5, 0);
                        cm.doc.setCursor(bmLine, 0);
                        return;
                    }
                }
                else
                {
                    //remove deleted bookmark
                    state.sorted.splice(i, 1);
                    ++i;
                    --max;
                }
            }
            if (max >= 0) //check again as all bookmarks may have been deleted!
            {
                //wrap around to last issue
                bmLine = state.sorted[max].find().line;
                cm.scrollIntoView(bmLine + 5, 0);
                cm.doc.setCursor(bmLine, 0);
            }
        }
    }

    CodeMirror.commands.ToggleBookmark = function(cm) { toggleBookmark(cm); };
    CodeMirror.commands.NextBookmark = function(cm) { nextBookmark(cm); };
    CodeMirror.commands.PreviousBookmark = function(cm) { previousBookmark(cm); };
    CodeMirror.commands.ClearAllBookmarks = function(cm) { clearAllBookmarks(cm); };
});
