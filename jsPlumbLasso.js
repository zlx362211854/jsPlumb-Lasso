/**
 * @Author zlx
 * @Date 2018/6/1 下午3:48
 */
+(function (w) {
    var Lasso = function (options) {
        const {
            keycode = 16,
            context,
            checkedClassName = 'lasso_checked_nodes',
            nodeClassName
        } = options;
        this.clientX1 = null; // 套索起点x坐标
        this.clientY1 = null; // 套索起点y坐标
        this.clientX2 = null; // 套索起点x坐标
        this.clientY2 = null; // 套索起点y坐标
        this.w = 0; // 套索区域宽
        this.h = 0; // 套索区域高
        this.top = null; // 套索固定定位top值
        this.left = null; // 套索固定定位left值

        this.lassoBuilded = false; // 是否添加了lasso
        this.moved = null; // 鼠标move状态
        this.nodes = []; // checked的nodes
        this.keycode = keycode; // keycode
        this.context = context; // nodes节点集合的父元素
        this.checkedClassName = checkedClassName;
        this.nodeClassName = nodeClassName;
        this.cb = null; // 选中回调
        this.copy = null; // 复制回调
    }
    var proto = {
        create: function (container, content) {
            if (!container) {
                container = this.context;
            }
            this.containerOffsetLeft = container[0].getBoundingClientRect().x;
            // container jquery对象 用做鼠标事件绑定 content niceScroll对象 用做niceScroll锁止
            if (content) {
                content.locked = false;
                this.content = content;
            }
            this.container = container;
            this.keyCodeObserver(container, content);
            return this;
        },
        getCheckedNode: function (cb) {
            this.cb = cb;
        },
        handleCopy: function (fn) {
            this.copy = fn;
        },
        keyCodeObserver: function (container, content) {
            const t = this;
            $(document).keydown((e) => {
                // shift keycode
                t.addClickListen(false)
                if (e.keyCode === t.keycode) {
                    if (content) {
                        content.cancelScroll();
                        content.locked = true;
                    }
                    // 监听鼠标左键
                    t.leftMouseDownObserver(container);
                }
                // 复制
                if (e.key === 'v' && e.ctrlKey) {
                    if (t.copy) {
                        t.copy(t.nodes)
                    }
                }
            });
            $(document).keyup((e) => {

                if (e.keyCode === t.keycode) {
                    if (content) {
                        container.niceScroll({ touchbehavior: true });
                        content.locked = false;
                    }
                    container.unbind('mousedown');
                    container.unbind('mousemove');
                    t.addClickListen(true)
                }
            });
        },
        addClickListen: function (flag) {
            const t = this;
            if (!flag) {
                $(document).unbind('click')
            } else {
                $(document).on('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!t.content || t.content.locked === false) {
                        $('.' + t.checkedClassName).removeClass(t.checkedClassName)
                    }
                })
            }
        },
        leftMouseDownObserver: function (container) {
            const t = this;
            container.mousedown(function (e) {
                e.stopPropagation();
                e.preventDefault();
                // 如果是鼠标右键，则return
                if (e.button === 2) {
                    return
                }
                t.clientX1 = e.clientX;
                t.clientY1 = e.clientY;
                t.moved = false;
                // remove 套索
                $('.lasso').remove();
                t.lassoBuilded = false;
                // 监听鼠标移动
                t.mouseMoveListener($(this))
            });

            container.mouseup(function (e) {
                // 如果是鼠标右键，则return
                e.stopPropagation();
                e.preventDefault();

                if (e.button === 2) {
                    return
                }
                container.unbind('mousemove');
                $('.lasso').remove();
                // 鼠标move后才计算node坐标
                if (t.moved) {
                    t.moved = false;
                    // 计算坐标在套索工具中的node
                    const nodes = t.checkNodes();
                    t.nodes = nodes;
                    if (t.cb) {
                        t.cb(nodes); // 返回选中的nodes
                    }
                    // 更改node样式为选中
                    t.changeNodesStatus(nodes);
                }
            })
        },
        checkNodes: function () {
            const { context } = this;
            const t = this;
            const statusNodes = Array
                .prototype
                .slice
                .call(context[0].childNodes, 0)
                .filter(item => item.classList[0] === t.nodeClassName);
            statusNodes.forEach(function (item) {
                item.lassoChecked = false;
                const point = item.getBoundingClientRect();
                const { left, right, top, bottom } = point;
                // node的固定定位坐标
                item.points = {
                    lt: [
                        left, top
                    ],
                    lb: [
                        left, bottom
                    ],
                    rt: [
                        right, top
                    ],
                    rb: [right, bottom]
                }
                Object
                    .keys(item.points)
                    .forEach(function (i) {
                        if (item.points[i] instanceof Array) {
                            // 判断node的四个坐标其中有没有在lasso内部的坐标
                            if (t.calcPoint(item.points[i][0], item.points[i][1])) {
                                item.lassoChecked = true;
                            } else {
                                item.lassoChecked = item.lassoChecked
                                    ? item.lassoChecked
                                    : false
                            }
                        }
                    })
            });
            return statusNodes.filter(item => item.lassoChecked === true);
        },
        mouseMoveListener: function (target) {
            const t = this;
            target.bind('mousemove', (e) => {
                t.moved = true;
                // 添加套索
                if (!t.lassoBuilded) {
                    t.lasso(t.w, t.h);
                }
                // 保存鼠标移动坐标
                t.clientX2 = e.clientX;
                t.clientY2 = e.clientY;
                t.w = Math.abs(t.clientX1 - t.clientX2);
                t.h = Math.abs(t.clientY1 - t.clientY2);
                const top = t.clientY2 > t.clientY1
                    ? t.clientY1
                    : t.clientY2;
                const left = t.clientX2 > t.clientX1
                    ? t.clientX1
                    : t.clientX2;
                t.left = left;
                t.top = top;
                // 更新套索遮罩坐标
                t.changeLassoPosition(top, left - t.containerOffsetLeft);
            });
        },
        lasso: function (w, h) {
            if ($('.lasso').length === 0) {
                const lassoView = $('<div class="lasso"></div>');
                lassoView.css({ width: w, height: h });
                this
                    .container
                    .append(lassoView);
                this.lassoBuilded = true;
            } else {
                return;
            }
        },
        calcPoint: function (x, y) {
            const { left, top, w, h } = this;
            // left: lasso固定定位左偏移 top: lasso固定定位上偏移 w: lasso宽度 h: lasso高度
            if (x >= left && x <= left + w && y >= top && y <= top + h) {
                return true;
            } else {
                return false;
            }
        },
        changeNodesStatus: function (nodes) {
            const t = this;
            nodes.forEach(function (item) {
                if (item.lassoChecked) {
                    $('#' + item.id).addClass(t.checkedClassName);
                }
            })
        },
        changeLassoPosition: function (top, left) {
            const { w, h } = this;
            $('.lasso').css({ width: w, height: h, top: top, left: left });
        }
    }
    Lasso.prototype = proto;
    w.Lasso = Lasso;
})(window)