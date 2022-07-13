
let currentRoot = null, // 当前根Fiber
    workInProgress = null,  // 工作中的fiber
    nextUnitWork = null, // 工作fiber单元
    workInProgressFiber, // 用于函数fiber的hook
    hookIndex = 0,
    // 收集Effect Tag为DELET的fiber
    deletions = [],
    currentEffect = []; // 收集useEffect hook

const CLASS_COMPONENT = 'CLASS_COMPONENT',
    FUNCTION_COMPONENT = 'FUNCTION_COMPONENT',
    REACT_ELEMENT = 'REACT_ELEMENT',
    ROOT_ELEMENT = 'ROOT_ELEMENT';

class Component {
    static isClassComponent = true
}

function createElement(type, props = {}, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map((c) => isVirtualElement(c) ? c : createTextElement(c))
        }
    }
}
/**
 * 渲染入口
 */
function render(element, container) {
    // 先创建根fiber
    workInProgress = {
        type: ROOT_ELEMENT,
        stateNode: container,
        props: {
            children: [{
                ...element
            }]
        },
        alternate: currentRoot
    }
    deletions = [];
    nextUnitWork = workInProgress;
    workLoop();
}

function workLoop() {
    // 执行工作循环
    while (nextUnitWork) {
        // 执行每一个工作单元
        nextUnitWork = performUnitOfWork(nextUnitWork)
    }
    if (!nextUnitWork && workInProgress) {
        // 当nextUnitWork为null时 说明工作结束了 开始提交Root
        commitRoot();
        setTimeout(() => {
            [...currentEffect].forEach(hook => {
                debugger
                if (hook.needCall) {
                    const fn = hook.state;
                    hook.unMountCallback = fn();
                }
                if (hook.willUnMount === true && typeof hook.unMountCallback === 'function') {
                    hook.unMountCallback()
                }
            });
            currentEffect = []
        });

    }

}

/**
 * 执行当前的工作单元 即为一个当前的fiber节点
 */
function performUnitOfWork(unitOfWork) {
    const { type } = unitOfWork;
    const elementType = getElementTypeByFiber(type)
    switch (elementType) {
        case FUNCTION_COMPONENT:
            workInProgressFiber = unitOfWork;
            workInProgressFiber.hooks = [];
            unitOfWork.hookIndex = 0;
            const children = type(unitOfWork.props)
            reconcileChildren(unitOfWork, [isVirtualElement(children) ? children : createTextElement(children)])
            break;
        case CLASS_COMPONENT:
            break;
        case REACT_ELEMENT:
        case ROOT_ELEMENT:
            if (!unitOfWork.stateNode) {
                unitOfWork.stateNode = createDOM(unitOfWork)
            }
            reconcileChildren(unitOfWork, unitOfWork.props.children)
            break;
        default:

            break;
    }
    if (unitOfWork.child) {
        return unitOfWork.child
    }
    let nextFiberNode = unitOfWork;
    while (typeof nextFiberNode !== 'undefined') {
        if (nextFiberNode.sibling) {
            return nextFiberNode.sibling
        }
        nextFiberNode = nextFiberNode.return
    }
    return null

}

function reconcileChildren(unitOfWork, elements = []) {
    let index = 0;
    let oldFiberNode,
        prevSibling;
    const virtualElements = elements.flat(Infinity);
    if (unitOfWork?.alternate?.child) {
        // 获取老fiber
        oldFiberNode = unitOfWork.alternate.child
    }
    while (
        index < virtualElements.length ||
        typeof oldFiberNode !== 'undefined'
    ) {
        const virtualElement = virtualElements[index];
        let newFiber;
        const isSameType = Boolean(
            oldFiberNode &&
            virtualElement &&
            oldFiberNode.type === virtualElement.type
        )
        // 当type一样时候
        // 复用fiber
        if (isSameType) {
            newFiber = {
                type: oldFiberNode.type,
                stateNode: oldFiberNode.stateNode, // 这是复用了老的DOM
                alternate: oldFiberNode,
                props: virtualElement.props,
                return: unitOfWork,
                effectTag: 'UPDATE'
            }
        }
        // 当type不一样时，替换fiber
        if (!isSameType && virtualElement) {
            newFiber = {
                type: virtualElement.type,
                stateNode: null,
                alternate: null,
                props: virtualElement.props,
                return: unitOfWork,
                effectTag: 'REPLACEMENT'
            }
        }
        // 新老节点不一 则需要删除
        if (!isSameType && oldFiberNode) {
            deletions.push(oldFiberNode)
        }
        // 处理完成之后 继续处理弟弟
        if (oldFiberNode) {
            oldFiberNode = oldFiberNode.sibling
        }
        if (index === 0) { // 当index = 0 说明是第一个节点的diff 直接将新fiber赋值到当前fiber的child
            unitOfWork.child = newFiber
        } else if (typeof prevSibling !== 'undefined') {
            prevSibling.sibling = newFiber // 处理后续的弟弟 将新fiber给上一个fiber的sibling
        }
        prevSibling = newFiber; // 将当前的fiber节点标记为上一个fiber 继续循环
        index++
    }
}

function commitRoot() {
    const findParentFiber = (fiberNode) => {
        if (fiberNode) {
            let parentFiber = fiberNode.return;
            while (parentFiber && !parentFiber.stateNode) {
                parentFiber = parentFiber.return;
            }
            return parentFiber;
        }

        return null;
    };

    const commitDeletion = (parentDOM, DOM) => {
        parentDOM?.removeChild(DOM)
    }

    const commitReplacement = (parentDOM, DOM) => {
        parentDOM?.appendChild(DOM)
    }

    const commitWork = (fiber) => {

        if (fiber) {
            if (fiber.stateNode) {
                const parent = findParentFiber(fiber);
                switch (fiber.effectTag) {
                    case 'UPDATE':
                        updateDOM(
                            fiber.stateNode,
                            fiber.alternate ? fiber.alternate.props : {},
                            fiber.props,
                        );
                        break;
                    case 'REPLACEMENT':
                        commitReplacement(parent.stateNode, fiber.stateNode)
                        break;

                    default:
                        break;
                }
            }
            // 这里的递归可以想办法优化， 避免重复的提交
            commitWork(fiber.child)
            commitWork(fiber.sibling)

        }
    }

    for (const deletion of deletions) {
        console.log(deletion);
        if (deletion.child) {        // 当组件嵌套时候,需要删除组件的child，如果是多层组件嵌套，需要优化
            const parent = findParentFiber(deletion)
            commitDeletion(parent.stateNode, deletion.child.stateNode)
        }
        // 处理组件卸载
        if (deletion.hooks.length > 0) {
            deletion.hooks.forEach((hook) => {
                if (hook.type === 'effect') {
                    debugger
                    hook.willUnMount = true
                }
            })
        }

        if (deletion.stateNode) {
            const parent = findParentFiber(deletion)
            commitDeletion(parent.stateNode, deletion.stateNode)
        }
    }

    if (workInProgress !== null) {
        commitWork(workInProgress.child);
        currentRoot = workInProgress
    }


}

function useState(initState) {
    // 获取当前的hook
    const hook = workInProgressFiber?.alternate?.hooks ? workInProgressFiber.alternate.hooks[workInProgressFiber.hookIndex] : { state: initState, queue: [], type: 'state' }
    // queue主要用于处理多个setState的情况
    while (hook.queue.length) {
        let newState = hook.queue.shift(); // 通过循环取出最后一次set的state
        if (typeof newState === 'object' && typeof hook.state === 'object') {
            newState = { ...hook.state, ...newState }
        }
        hook.state = newState;
    }


    if (typeof workInProgressFiber.hooks === 'undefined') {
        workInProgressFiber.hooks = []
    }

    workInProgressFiber.hooks.push(hook);
    workInProgressFiber.hookIndex++;

    const setState = (value) => {
        hook.queue.push(value);
        if (currentRoot) {
            workInProgress = {
                type: currentRoot.type,
                stateNode: currentRoot.stateNode,
                props: currentRoot.props,
                alternate: currentRoot
            }
            nextUnitWork = workInProgress;
            deletions = [];
            currentRoot = null;
            workLoop()
        }
    }
    return [hook.state, setState]

}

function useEffect(fn, deps) {
    // if (deps?.length === 0) {
    //     debugger
    // }
    const isMout = !workInProgressFiber?.alternate?.hooks;
    let hook;
    if (isMout) {
        hook = { state: fn, deps, type: 'effect', willUnMount: false, needCall: true }
        currentEffect.push(hook)
    } else {
        hook = workInProgressFiber.alternate.hooks[workInProgressFiber.hookIndex]
        const prevDeps = hook.deps;
        if (hook.deps === undefined) {
            hook.needCall = true
        } else if (deps.length > 0) {
            const needNotUpdate = deps.every((dep, idx) => {
                return dep === prevDeps[idx]
            })
            if (!needNotUpdate) {
                hook.needCall = true
            }
        } else {
            hook.needCall = false
        }
        currentEffect.push(hook)
    }
    hook.deps = Array.isArray(deps) ? [...deps] : deps
    workInProgressFiber.hooks.push(hook);
    workInProgressFiber.hookIndex++;
}
/**
 * 是否是虚拟DOM
 */
function isVirtualElement(e) {
    return typeof e === 'object'
}
/**
 * 根据fiber获取当前fiber节点的React元素类型
 */
function getElementTypeByFiber(type) {
    if (type === ROOT_ELEMENT) return ROOT_ELEMENT
    const t = typeof type;
    if (t === 'function') {
        return type.isClassComponent ? CLASS_COMPONENT : FUNCTION_COMPONENT
    } else if (t === 'number' || t === 'string') {
        return REACT_ELEMENT
    }
}

function createTextElement(text) {
    return {
        type: 'TEXT',
        props: {
            nodeValue: text
        }
    }
}

function createDOM(fiber) {
    const { type, props } = fiber;
    const DOM = type === 'TEXT' ? document.createTextNode(props.nodeValue) : document.createElement(type)
    if (DOM !== null) {
        updateDOM(DOM, {}, props)
    }
    return DOM
}

function updateDOM(DOM, prevProps, nextProps) {
    // 剩余的老的keys
    let restKeys = Object.keys(prevProps);
    for (const key of Object.keys(nextProps)) {
        // 如果新老都有
        if (restKeys.includes(key)) {
            // 先删除老的key
            const idx = restKeys.findIndex(k => k === key)
            restKeys.splice(idx, 1);
        }
        if (prevProps[key] !== nextProps[key]) {
            updateProp(DOM, key, prevProps[key], nextProps[key])
        }
    }
    // 如果存在restKeys 说明这些属性都是需要删除的
    for (const oldKey of restKeys) {
        removeProp(DOM, oldKey, prevProps[key])
    }
}
// 更新prop
function updateProp(DOM, key, oldValue, value) {
    if (key.startsWith('on')) {
        DOM.addEventListener(key.slice(2).toLowerCase(), value)
        // 如果老的事件存在需要注销老事件,不然会有多次触发事件的bug
        DOM.removeEventListener(key.slice(2).toLowerCase(), oldValue)
    } else if (key === 'style') {
        // 处理style
    } else if (key !== 'children') {
        DOM[key] = value
    }
}
// 删除prop
function removeProp(DOM, key, value) {
    if (key.startsWith('on')) {
        DOM.removeEventListener(key.slice(2).toLowerCase(), value)
    } else if (key !== 'children') {
        DOM[key] = ''
    }
}


const React = {
    createElement,
    render,
    Comment,
    useState,
    useEffect
}

export default React;