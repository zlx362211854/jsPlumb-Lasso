### overview

![eg](./eg.gif)

### usage

```
var context = $('#right');
const lasso = new Lasso({
    keycode: 16, // key code
    context: context, // container
    nodeClassName: 'node', // node class name
    checkedClassName: 'lasso_checked_nodes' // lasso class name 
});
lasso.create();
lasso.getCheckedNode((node) => {
    console.log(node, 'nodess');
});
```