const popupHtml = `
<div id="infoBox">
<div id="reuslt">
    <div id="matchResult">
        <span class="commonTitle">匹配关系</span>
        <div id="matchDataWaitInfo">匹配关系查询中...</div>
        <table id="matchTable" class="noData">
            <thead>
                <tr>
                    <th>lemmaId</th>
                    <th>itemUrl</th>
                    <th>创建时间</th>
                    <th>来源</th>
                </tr>
            </thead>
        </table>
    </div>
    <div id="structResult" class="noData">
        <div id="waitInfo">正在查询...</div>
        <div id="categoriesContainer">
            <span class="structTitle">分类</span>
            <span id="categoriesData"></span>
        </div>
        <div id="tagContainer">
            <span class="structTitle">标签</span>
            <span id="tagData"></span>
        </div>
        <div id="aliasContainer">
            <span class="structTitle">同义词</span>
            <span id="aliasData"></span>
        </div>
    </div>
    <div id="repeatResult">
        <span class="commonTitle">重复词条</span>
        <div id="repeatDataWaitInfo">重复词条查询中...</div>
        <table id="repeatTable" class="noData">
            <thead>
                <tr>
                    <th>最优lemmaId</th>
                    <th>最优itemUrl</th>
                    <th>创建时间</th>
                    <th>搜索重复组</th>
                    <th>百度重复组</th>
                </tr>
            </thead>
        </table>
    </div>
    <div id="cardResult">
        <span class="commonTitle">卡片</span>
        <div>
        </div>
    </div>
    <button id="handleCloseInfoBox">关闭</button>
</div>
`;

$("body").append($(popupHtml));

$("#handleCloseInfoBox").on("click", () => {
    $("#infoBox").css("display", "none")
})

let baiduMatchArray = [];
const repeatDataArray = [];
let targetUrl;

const dominPath = "jwensh.jayzhen.com";
let structResult = document.getElementById("structResult");
function popJs() {
    //设置等待信息
    $("#waitInfo").text("正在查询...");
    const url = location.href;
    getLemmaId(url);

}



//处理百度词条页
function handleBaiduLemma(path) {
    getMatchData({
        type: "baidu",
        path: path
    });
}

//处理搜索词条页
function handlejayzhenLemma(lemmaId) {
    getStructData(lemmaId);
    getMatchData({
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
    let url = `https://${dominPath}/api/getCardInfo?lemmaId=${lemmaId}`;
    chrome.runtime.sendMessage({
        contentScriptQuery: "cardData", url: url
    },
        result => {
            if (result && result.error) {
                $("#cardResult").append("<div>当前网络无权限或卡片接口错误</div>");
                return;
            }
            if (result && result.isExist === true) {
                $("#cardResult").append(`<div><a href="${result.url}" target="_blank">${result.url}</a></div>`);
            } else {
                $("#cardResult").append("<div>暂无卡片</div>");
            }
        });
}


function getMatchData(opt) {
    const data = {};
    let url;
    if (opt.type === "jayzhen") {
        data.lemmaId = opt.lemmaId;
        url = `https://${dominPath}/api/getBkMatchRelation?lemmaId=${data.lemmaId}`;
    } else if (opt.type === "baidu") {
        data.itemUrl = opt.path.substr(1);
        url = `https://${dominPath}/api/getBkMatchRelation?itemUrl=${data.itemUrl}`;
    } else {
        return;
    }
    chrome.runtime.sendMessage({
        contentScriptQuery: "matchData", url: url
    },
        result => {
            if (result && result.error) {
                $("#matchDataWaitInfo").text("匹配接口错误或无网络权限");
                if (opt.type === "baidu") {
                    $("#repeatDataWaitInfo").text("重复查询接口错误或无网络权限");
                    $("#cardResult").css("display", "none");
                }
                return;
            }
            if (result && result.is_success === true && result.data && result.data.length) {
                if (opt.type === "baidu") {
                    baiduMatchArray = result.data;
                    console.log("Array: ", baiduMatchArray)
                    getRepeatData({
                        isMulti: true,
                        type: "baidu",
                        index: 0,
                        list: baiduMatchArray
                    });
                    if (baiduMatchArray.length === 1) {
                        const lemmaId = baiduMatchArray[0].lemma_id;
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
                if (opt.type === "baidu") {
                    $("#repeatDataWaitInfo").text("没有查找到重复数据");
                    $("#cardResult").css("display", "none");
                }
            }

        });
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
        data.lemmaId = opt.lemmaId;
    } else if (opt.type === "baidu") {
        data.lemmaId = opt.list[opt.index].lemma_id;
    } else {
        return;
    }
    const url = `https://${dominPath}/api/geBkGroup?lemmaId=${data.lemmaId}`;
    chrome.runtime.sendMessage({
        contentScriptQuery: "repeatData", url: url
    },
        result => {
            if (result && result.error) {
                $("#repeatDataWaitInfo").text("重复查询接口错误或无网络权限");
                return;
            }
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
                            list: baiduMatchArray,
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
                    if (opt.index < opt.list.length) {
                        getRepeatData({
                            isMulti: true,
                            type: "baidu",
                            list: baiduMatchArray,
                            index: opt.index + 1
                        })
                    } else {
                        $("#repeatDataWaitInfo").text("没有查找到重复数据");
                    }
                }
            }

        });
}

function finishRepeat() {
    $("#repeatDataWaitInfo").text("");
    $("#repeatTable").attr("class", "hasData");
}

function renderRepeatData(list) {
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
    let url = `https://${dominPath}/api/getLemmaShortInfo?lemmaId=${lemmaId}`;
    chrome.runtime.sendMessage({
        contentScriptQuery: "repeatData", url: url
    },
        result => {
            if (result && result.code === 0) {
                renderStructData(result.data);
            }
        });
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
    if (type === "jayzhen") {
        handlejayzhenLemma(lemmaId)
    } else if (type === "baidu") {
        handleBaiduLemma(path);
    } else {
        $("#reuslt").html("无法识别的url");
        setTimeout(function () {
            $("#infoBox").css("display", "none");
        }, 2000)
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
        getLemmaId(url);
        sendResponse({ "message": "get url success" })
    }
);
popJs();
