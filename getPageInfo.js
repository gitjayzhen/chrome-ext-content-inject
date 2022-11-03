var url = window.location.href;
// 主动发送消息
chrome.runtime.sendMessage({ url: url }, function (response) {
    console.log(response, document.body);
});