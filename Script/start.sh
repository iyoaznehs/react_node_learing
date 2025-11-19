# ---------Prepare----------------
echo "Preprations ..."
script_root=$(pwd)
backend_log=${script_root}/backend.log
frontend_log=${script_root}/frontend.log
root=${script_root%/*}/
backend_root=${root}feynman-platform-backend
echo "后端路径为: ${backend_root}"
frontend_root=${root}feynman-platform-frontend
echo "前端路径为: $frontend_root"
echo "ready!"
# 这里得来一个前端依赖校验吧,maybe
# cd ${frontend_root}
# $(npm install)
# cd ${script_root}
# ------------------Run--------------------
function run_backend {
    echo "启动后端项目: "
    echo ${backend_log}
    ( (cd ${backend_root} && node ./index.js) > backend.log 2>&1 ) &
    backend_id=$!
    echo "pid: "${backend_id}
    echo "后端启动完成， 查看堆栈信息: ${backend_log}"
}
function run_frontend {
    echo "启动前端项目: "
    ( (cd ${frontend_root} && NO_COLOR=1 vite) > frontend.log 2>&1 ) &
    frontend_id=$!
    echo "pid: "${frontend_id}
    echo "前端启动完成， 查看堆栈信息: ${frontend_log}"
}
run_backend
run_frontend

# ----------------Risk-----------------------
function cleanup {
    kill -9 ${backend_id}
# 前端好像kill 不干净，好麻烦
    kill -9 ${frontend_id}
    echo "bye"
}
trap cleanup SIGINT SIGTERM
# ------------------Waiting------------------
while true; do
    echo "1 - 关闭前后端； 2 - 重启前后端； 3 - 重启前端； 4 - 重启后端"
    read text
    if [ "$text" = "1" ]; then
        kill ${backend_id}
        kill ${frontend_id}
        break    
    elif [ "$text" = "2" ]; then
        kill ${backend_id}
        kill ${frontend_id}
        run_backend
        run_frontend
        echo "over"
    elif [ "$text" = "3" ]; then
        kill ${frontend_id}
        run_frontend
    elif [ "$text" = "4" ]; then
        kill ${backend_id}
        run_backend
    else
        echo "无效输入"
    fi
done
echo "bye!"