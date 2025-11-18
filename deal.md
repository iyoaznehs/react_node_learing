# 规范
## 返回形式 - json
```json
{
    code: 0 返回 0 成功， 1 失败
    msg: "msg" 同时附加返回错误信息
    data: {
        "token" 其他信息放在data里面， 同样k-v

    }
}
```
返回的状态码: status 都是200，代表访问通了

- 访问数据库之类的都没有判断是否成功
- 获取知识点， 俩吧，好像调了两次, later...

HTTP : 200, 404, 500
200


```js
// 发送请求的时候， 解析请求， 验证是否成功(res.data.code) ...
// 后端发送响应，json 
res.json{
    code : 0,
    msg: "1",
    data: {
        k: 1, 
        v: 1,
    }
}
```