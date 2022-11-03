chrome.runtime.onInstalled.addListener(function () {
    // Replace all rules ...
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        // With a new rule ...
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { urlContains: 'jwensh' },
                    })
                ],
                // And shows the extension's page action.
                actions: [new chrome.declarativeContent.ShowPageAction()]
            }
        ]);
    });
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        const url = request.url;
        fetch(url)
            .then(response => {
                return response.json();
            })
            .then(result => {
                if (result.reason === "ip无权限" || result.msg === "ip无权限") {
                    return sendResponse({ error: true })
                } else {
                    return sendResponse(result);
                }
            })
            .catch(error => sendResponse({ error: true }))
        return true;
    });