// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.


$(document).ready(function() {

    function setAktivMenu(text) {
        $('#serviceDeskId').val(text).html(function(i, html) {
            return text + html.slice(html.indexOf(' <'));
        });
    }
    $('#serviceDeskId + .dropdown-menu').on('click', 'a', function() {
        setAktivMenu($(this).text());
    });

    function setAktivMenu(text) {
        $('#queueId').val(text).html(function(i, html) {
            return text + html.slice(html.indexOf(' <'));
        });
    }
    $('#queueId + .dropdown-menu').on('click', 'a', function() {
        setAktivMenu($(this).text());
    });


});
