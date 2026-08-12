/**
 * 适配器文件，用于微信小游戏
 */
// 创建全局GameGlobal对象
const GameGlobal = GameGlobal || {};

// 创建全局window对象
const window = GameGlobal.window = {};
window.navigator = {};

const document = window.document = {
    createElement: function (tagName) {
        if (tagName === 'canvas') {
            return wx.createCanvas();
        }
    },
    body: {}
};

// 扩展 wx.createCanvas
const _createCanvas = wx.createCanvas;
wx.createCanvas = function () {
    const canvas = _createCanvas();
    canvas.type = 'canvas';
    // 扩展 canvas 对象
    canvas.getBoundingClientRect = function () {
        const width = canvas.width;
        const height = canvas.height;
        return {
            top: 0,
            left: 0,
            width: width,
            height: height
        };
    };
    canvas.style = {};
    canvas.addEventListener = function () { }

    return canvas;
};

// 暴露接口
GameGlobal.navigator = window.navigator;
GameGlobal.document = document; 