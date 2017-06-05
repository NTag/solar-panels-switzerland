'use strict';

function foo(x) {
    if (x == 1) {
        return 1;
    }
    else {
        return foo(x-1);
    }
}

console.log(foo(100000));

