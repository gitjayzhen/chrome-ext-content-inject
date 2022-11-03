let baiduMathArray = [];
const repeatDataArray = [];
let targetUrl;

const dominPath = "frontend-jwensh-mapping.jwensh.alps.thanos-lab.jayzhen";
let structResult = document.getElementById("structResult");
async function popJs() {
    //设置等待信息
    $("#waitInfo").text("正在查询...");
    console.log("targetUrl: ", targetUrl);
    if (targetUrl) {
        getLemmaId(targetUrl);
    } else {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.executeScript(tabs[0].id, { file: 'getPageInfo.js' });
        });
    }
    console.log("already pop")

}

function getPageInfo() {
    const url = window.location.href;
    // 主动发送消息
    chrome.runtime.sendMessage({ url: url }, function (response) {
        console.log(response, document.body);
    });

}


//处理百度词条页
function handleBaiduLemma(path) {
    getMathData({
        type: "baidu",
        path: path
    });
}

//处理搜索词条页
function handlejayzhenLemma(lemmaId) {
    getStructData(lemmaId);
    getMathData({
        type: "jayzhen",
        lemmaId: lemmaId
    });
    getRepeatData({
        type: "jayzhen",
        lemmaId: lemmaId
    });
    getCardData(lemmaId);
}


function getCardData(lemmaId) {
    const data = { id: lemmaId };
    $.ajax({
        url: `http://api.zhishi.jayzhen/gateway/ksh/check_exist`,
        type: 'get',
        data: data,
        dataType: 'json',
        success: function (result) {
            if (result && result.isExist === true) {
                $("#cardResult").append(`<div><a href="${result.url}" target="_blank">${result.url}</a></div>`);
            } else {
                $("#cardResult").append("<div>暂无卡片</div>");
            }
        },
        error: function () {
            $("#cardResult").append("<div>当前网络无权限或卡片接口错误</div>");
        }
    })
}


function getMathData(opt) {
    const data = {};
    let url;
    if (opt.type === "jayzhen") {
        data.lemmaid = opt.lemmaId;
        url = `http://${dominPath}/jwenshmappingview/jwensh_match_relation?lemmaid=${data.lemmaid}`;
    } else if (opt.type === "baidu") {
        data.itemurl = opt.path.substr(1);
        url = `http://${dominPath}/jwenshmappingview/jwensh_match_relation?itemurl=${data.itemurl}`;
    } else {
        return;
    }
    $.ajax({
        url: url,
        type: 'get',
        dataType: 'json',
        success: function (result) {
            if (result && result.is_success === true && result.data && result.data.length) {
                if (opt.type === "baidu") {
                    baiduMathArray = result.data;
                    getRepeatData({
                        isMulti: true,
                        type: "baidu",
                        index: 0,
                        list: baiduMathArray
                    });
                    if (baiduMathArray.length === 1) {
                        const lemmaId = baiduMathArray[0].lemma_id;
                        getStructData(lemmaId);
                        getCardData(lemmaId);
                    } else {
                        $("#cardResult").append("<div>多组匹配数据不展示卡片</div>")
                    }
                }
                matchDataFinish();
                renderMatchData(result.data);
            } else {
                $("#matchDataWaitInfo").text("没有查找到匹配数据");
            }
        },
        error: function () {
            $("#matchDataWaitInfo").text("匹配接口错误或无网络权限");
        }
    })
}

function matchDataFinish() {
    $("#matchDataWaitInfo").text("");
    $("#matchTable").attr("class", "hasData");
}

function getRepeatData(opt) {
    if (opt.type === "baidu") {
        if (opt.index >= opt.list.length) {
            if (repeatDataArray.length) {
                finishRepeat();
                renderRepeatData(repeatDataArray);
            } else {
                $("#repeatDataWaitInfo").text("没有查找到重复数据");
            }
            return;
        }
    }
    const data = {};
    if (opt.type === "jayzhen") {
        data.lemmaid = opt.lemmaId;
    } else if (opt.type === "baidu") {
        data.lemmaid = opt.list[opt.index].lemma_id;
    } else {
        return;
    }
    console.log("data: ", data, "url: ", `http://${dominPath}/jwenshmappingview/jwensh_group`)
    $.ajax({
        url: `http://${dominPath}/jwenshmappingview/jwensh_group`,
        type: 'get',
        data: data,
        dataType: 'json',
        success: function (result) {
            if (result && result.is_success === true && result.data && !$.isEmptyObject(result.data)) {
                if (opt.type === "jayzhen") {
                    finishRepeat();
                    renderRepeatData([result.data]);
                } else if (opt.type === "baidu") {
                    repeatDataArray.push(result.data);
                    if (opt.index < opt.list.length) {
                        getRepeatData({
                            isMulti: true,
                            type: "baidu",
                            list: baiduMathArray,
                            index: opt.index + 1
                        })
                    } else {
                        finishRepeat();
                        renderRepeatData(repeatDataArray);
                    }
                }
            } else {
                if (opt.type === "jayzhen") {
                    $("#repeatDataWaitInfo").text("没有查找到重复数据");
                } else if (opt.type === "baidu") {
                    console.log("result: ", result, "opt: ", opt);
                    if (opt.index < opt.list.length) {
                        getRepeatData({
                            isMulti: true,
                            type: "baidu",
                            list: baiduMathArray,
                            index: opt.index + 1
                        })
                    } else {
                        $("#repeatDataWaitInfo").text("没有查找到重复数据");
                    }
                }
            }
        },
        error: function () {
            $("#repeatDataWaitInfo").text("重复查询接口错误或无网络权限");
        }
    })
}

function finishRepeat() {
    $("#repeatDataWaitInfo").text("");
    $("#repeatTable").attr("class", "hasData");
}

function renderRepeatData(list) {
    console.log("list: ", list)
    const $tbody = $("<tbody></tbody");
    for (let i = 0; i < list.length; i++) {
        const data = list[i];
        const $tr = $("<tr></tr>");
        if (data.chosed_lemmaId) {
            const $content = `<td><a target="_blank" href="https://jwensh.jayzhen.com/v${data.chosed_lemmaId}.htm">${data.chosed_lemmaId}</a></td>`;
            $tr.append($content);
        }
        if (data.chosed_itemurl) {
            const $content = `<td><a target="_blank" href="https://jwensh.baidu.com/${data.chosed_itemurl}">${data.chosed_itemurl}</a></td>`;
            $tr.append($content);
        }
        if (data.create_time) {
            const $content = `<td>${transformTime(data.create_time)}</td>`;
            $tr.append($content);
        }
        if (data.jayzhen_group && data.jayzhen_group.length) {
            const list = data.jayzhen_group;
            const $content = $(`<td></td>`);
            for (let i = 0; i < list.length; i++) {
                $content.append(`<div><a target="_blank" href="https://jwensh.jayzhen.com/v${list[i]}.htm">${list[i]}</a></div>`);
            }
            $tr.append($content);
        }
        if (data.baidu_group && data.baidu_group.length) {
            const list = data.baidu_group;
            const $content = $(`<td></td>`);
            for (let i = 0; i < list.length; i++) {
                $content.append(`<div><a target="_blank" href="https://jwensh.baidu.com/${list[i]}">${list[i]}</a></div>`);
            }
            $tr.append($content);
        }
        $tbody.append($tr);
    }

    $("#repeatTable").append($tbody);
}

function resetSearch() {
    console.log("resetSearch");
    $("#waitInfo").text("");
    $("#structResult").attr("class", "hasData");
}

function renderMatchData(data) {
    const $tbody = $("<tbody></tbody");
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const $tr = $("<tr></tr>");
        if (item.lemma_id) {
            const $content = `<td><a target="_blank" href="https://jwensh.jayzhen.com/v${item.lemma_id}.htm">${item.lemma_id}</a></td>`;
            $tr.append($content);
        }
        if (item.item_url) {
            const $content = `<td><a target="_blank" href="https://jwensh.baidu.com/${item.item_url}">${item.item_url}</a></td>`;
            $tr.append($content);
        }
        if (item.create_time) {
            const $content = `<td>${transformTime(item.create_time * 1000)}</td>`;
            $tr.append($content);
        }
        if (item.source) {
            const $content = `<td>${item.source}</td>`;
            $tr.append($content);
        }
        $tbody.append($tr);
    }
    $("#matchTable").append($tbody);
}

//获取结构数据
function getStructData(lemmaId) {
    console.log("lemmaId: ", lemmaId);
    $.ajax({
        url: 'https://jwensh.jayzhen.com/api/getLemmaShortInfo',
        type: 'get',
        data: {
            lemmaId: lemmaId
        },
        dataType: 'json',
        success: function (result) {
            if (result && result.code === 0) {
                renderStructData(result.data);
            }
        }
    })
}
//渲染结构数据
function renderStructData(data) {
    let categoriesString = "";
    if (data && data.categories && data.categories.length && data.categories[0] && data.categories[0].length) {
        const categories = data.categories[0];
        const categoriesArray = [];

        for (let i = 0; i < categories.length; i++) {
            const categoriesItem = categories[i];
            if (categoriesItem) {
                const cateReg = categoriesItem.match(/^(.+)\:/);
                if (cateReg && cateReg.length && cateReg.length > 1 && cateReg[1]) {
                    categoriesArray.push(cateReg[1]);
                }
            }
        }

        if (categoriesArray.length) {
            categoriesString = categoriesArray.join("->");
            $("#categoriesData").text(categoriesString);
        }
    } else {
        $("#categoriesData").text("无");
    }

    let tagsString = "";
    if (data && data.tags && data.tags.length) {
        const tags = data.tags;
        const tagsArray = [];

        for (let i = 0; i < tags.length; i++) {
            const tagsItem = tags[i];
            if (tagsItem) {
                tagsArray.push(tagsItem);
            }
        }

        if (tagsArray.length) {
            tagsString = tagsArray.join(" ");
            $("#tagData").text(tagsString);
        }
    } else {
        $("#tagData").text("无");
    }

    let aliasString = "";
    if (data && data.alias && data.alias.length) {
        const alias = data.alias;
        const aliasArray = [];

        for (let i = 0; i < alias.length; i++) {
            const aliasItem = alias[i];
            if (aliasItem && aliasItem.alias) {
                aliasArray.push(aliasItem.alias);
            }
        }

        if (aliasArray.length) {
            aliasString = aliasArray.join(" ");
            $("#aliasData").text(aliasString);
        }
    } else {
        $("#aliasData").text("无");
    }

    if (categoriesString || tagsString || aliasString) {
        resetSearch();
    }

}




function getLemmaId(url) {
    let lemmaId, type, baiduPath;
    const jayzhenIdReg = url.match(/v(\d+).htm/);
    const baiduIdReg = url.match(/jwensh.baidu.com/);
    if (jayzhenIdReg) {
        lemmaId = jayzhenIdReg[1];
        type = "jayzhen";
    } else if (baiduIdReg) {
        type = "baidu";
        path = new URL(url).pathname;
    }
    console.log(type)
    if (type === "jayzhen") {
        handlejayzhenLemma(lemmaId)
    } else if (type === "baidu") {
        handleBaiduLemma(path);
    } else {
        console.log("aaa")
        $("#reuslt").html("无法识别的url");
    }
}

function transformTime(timestamp = +new Date()) {
    if (timestamp) {
        var time = new Date(timestamp);
        var y = time.getFullYear();
        var M = time.getMonth() + 1;
        var d = time.getDate();
        var h = time.getHours();
        var m = time.getMinutes();
        var s = time.getSeconds();
        return y + '-' + addZero(M) + '-' + addZero(d) + ' ' + addZero(h) + ':' + addZero(m) + ':' + addZero(s);
    } else {
        return '';
    }
}
function addZero(m) {
    return m < 10 ? '0' + m : m;
}

// 接收消息
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        const url = request.url;
        targetUrl = url;
        console.log("targetUrl2: ", targetUrl);
        getLemmaId(url);
        sendResponse({ "message": "get url success" })
    }
);
popJs();
