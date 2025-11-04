# IDE 配置说明（解决导入无法 resolve 的问题）

## ✅ 已完成的修复

1. **安装所有依赖**：已在虚拟环境中安装 Flask、pandas、numpy、networkx 等
2. **创建 IDE 配置**：已创建 `.vscode/settings.json` 和 `.python-version`

## 🔧 让 IDE 识别虚拟环境

### 方法 1：重启 IDE（推荐）
1. 完全关闭 Cursor/VSCode
2. 重新打开项目
3. IDE 会自动识别 `.vscode/settings.json` 中的 Python 解释器路径

### 方法 2：手动选择解释器
1. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 "Python: Select Interpreter"
3. 选择：`./venv/bin/python` 或 `/Users/allenzhao/Github Repository/sciscinet-p1/.venv/bin/python`

### 方法 3：重新加载窗口
1. 按 `Cmd+Shift+P` (Mac)
2. 输入 "Developer: Reload Window"
3. 窗口会重新加载并识别虚拟环境

## ✅ 验证

打开 `backend/app.py`，导入应该不再显示红色下划线：
- `import pandas as pd` ✅
- `import numpy as np` ✅
- `import networkx as nx` ✅
- `from flask import Flask` ✅
- `from flask_cors import CORS` ✅

## 📝 如果仍然无法 resolve

1. 检查虚拟环境路径是否正确：
   ```bash
   ls -la .venv/bin/python
   ```

2. 手动激活虚拟环境测试：
   ```bash
   source .venv/bin/activate
   python -c "import flask, pandas, numpy, networkx; print('OK')"
   ```

3. 如果 IDE 仍然不识别，尝试：
   - 删除 `.vscode` 文件夹后重新打开项目
   - 或者手动在 IDE 设置中指定 Python 路径

