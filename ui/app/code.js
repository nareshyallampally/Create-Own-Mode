$(document).ready(function() {
    CodeMirror.defineMode("mymode", function() {

        // return {
        //     token: function(stream,state) {
        //         var ch = /[A-Za-z]+/;
        //         var numbers = /[0-9]/
        //         if (stream.match(ch) ) {
        //             return "atom";
        //         } else if (stream.match(numbers) ) {
        //             return "style2";
        //         } else {
        //             stream.next();
        //             return null;
        //         }
        //     }
        // };

        function failFirstLine(stream, state) {
            stream.skipToEnd();
            state.cur = header;
            return "error";
            var ch = stream.next();
            if (ch == '"' || ch == "'") {
                state.tokenize = tokenString(ch);
                return state.tokenize(stream, state);
            } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
                return ret("number", "number");
            } else if (ch == "." && stream.match("..")) {
                return ret("spread", "meta");
            } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
                return ret(ch);
            } else if (ch == "=" && stream.eat(">")) {
                return ret("=>", "operator");
            } else if (ch == "0" && stream.eat(/x/i)) {
                stream.eatWhile(/[\da-f]/i);
                return ret("number", "number");
            } else if (ch == "0" && stream.eat(/o/i)) {
                stream.eatWhile(/[0-7]/i);
                return ret("number", "number");
            } else if (ch == "0" && stream.eat(/b/i)) {
                stream.eatWhile(/[01]/i);
                return ret("number", "number");
            } else if (/\d/.test(ch)) {
                stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
                return ret("number", "number");
            } else if (ch == "/") {
                if (stream.eat("*")) {
                    state.tokenize = tokenComment;
                    return tokenComment(stream, state);
                } else if (stream.eat("/")) {
                    stream.skipToEnd();
                    return ret("comment", "comment");
                } else if (expressionAllowed(stream, state, 1)) {
                    readRegexp(stream);
                    stream.match(/^\b(([gimyus])(?![gimyus]*\2))+\b/);
                    return ret("regexp", "string-2");
                } else {
                    stream.eat("=");
                    return ret("operator", "operator", stream.current());
                }
            } else if (ch == "`") {
                state.tokenize = tokenQuasi;
                return tokenQuasi(stream, state);
            } else if (ch == "#") {
                stream.skipToEnd();
                return ret("error", "error");
            } else if (isOperatorChar.test(ch)) {
                if (ch != ">" || !state.lexical || state.lexical.type != ">") {
                    if (stream.eat("=")) {
                        if (ch == "!" || ch == "=") stream.eat("=")
                    } else if (/[<>*+\-]/.test(ch)) {
                        stream.eat(ch)
                        if (ch == ">") stream.eat(ch)
                    }
                }
                return ret("operator", "operator", stream.current());
            } else if (wordRE.test(ch)) {
                stream.eatWhile(wordRE);
                var word = stream.current()
                if (state.lastType != ".") {
                    if (keywords.propertyIsEnumerable(word)) {
                        var kw = keywords[word]
                        return ret(kw.type, kw.style, word)
                    }
                    if (word == "async" && stream.match(/^(\s|\/\*.*?\*\/)*[\[\(\w]/, false))
                        return ret("async", "keyword", word)
                }
                return ret("variable", "variable", word)
            }
        }

        function start(stream, state) {
            if (stream.match(/^HTTP\/\d\.\d/)) {
                state.cur = responseStatusCode;
                return "style1";
            } else if (stream.match(/^[A-Z]+/) && /[ \t]/.test(stream.peek())) {
                state.cur = requestPath;
                return "style1";
            } else if (stream.match(/(^|.\s)[A-Z]/g)) {

                return "style2";
            } else {
                return failFirstLine(stream, state);
            }
        }


        function responseStatusCode(stream, state) {
            var code = stream.match(/^\d+/);
            if (!code) return failFirstLine(stream, state);

            state.cur = responseStatusText;
            var status = Number(code[0]);
            if (status >= 100 && status < 200) {
                return "positive informational";
            } else if (status >= 200 && status < 300) {
                return "positive success";
            } else if (status >= 300 && status < 400) {
                return "positive redirect";
            } else if (status >= 400 && status < 500) {
                return "negative client-error";
            } else if (status >= 500 && status < 600) {
                return "negative server-error";
            } else {
                return "error";
            }
        }

        function responseStatusText(stream, state) {
            stream.skipToEnd();
            state.cur = header;
            return null;
        }

        function requestPath(stream, state) {
            stream.eatWhile(/\S/);
            state.cur = requestProtocol;
            return "string-2";
        }

        function requestProtocol(stream, state) {
            if (stream.match(/^HTTP\/\d\.\d$/)) {
                state.cur = header;
                return "style1";
            } else {
                return failFirstLine(stream, state);
            }
        }

        function header(stream) {
            if (stream.sol()) {
                stream.eat(/[ \t]/);
                if (stream.match(/^\s*[Hh]ost?:/)) {
                    return "style2";
                } else if (stream.match(/^\(\s*/)) {
                    return "style2";
                } else if (stream.match(/^.*?:/)) {
                    return "atom";
                } else {
                    stream.skipToEnd();
                    return "error";
                }
            } else {
                stream.skipToEnd();
                return "string";
            }

        }

        function body(stream) {
            stream.skipToEnd();
            return null;
        }
        return {
            token: function(stream, state) {
                var cur = state.cur;
                if (cur != header && cur != body && stream.eatSpace()) return null;
                return cur(stream, state);
            },

            startState: function() {
                return {
                    cur: start
                };
            }
        };
    });
    var editor = CodeMirror.fromTextArea(document.getElementById("cm"), {
        lineNumbers: true,
        mode: "mymode",
        matchBrackets: true
    });

});