import json
import io
import sys
from contextlib import redirect_stdout

with open('Meridian_TPRM_AI_Due_Diligence.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Global execution context
exec_globals = {
    'display': lambda x: print(x.to_string() if hasattr(x, 'to_string') else x)
}

exec_count = 1
for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        source_code = ''.join(cell['source'])
        stdout_buf = io.StringIO()
        try:
            with redirect_stdout(stdout_buf):
                exec(source_code, exec_globals)
            out_text = stdout_buf.getvalue()
            cell['execution_count'] = exec_count
            if out_text:
                # Split lines properly for ipynb format
                lines = [line + '\n' for line in out_text.splitlines()]
                cell['outputs'] = [{
                    'name': 'stdout',
                    'output_type': 'stream',
                    'text': lines
                }]
            else:
                cell['outputs'] = []
            exec_count += 1
            print(f'Cell {exec_count-1} executed successfully.')
        except Exception as e:
            print(f'Error executing cell {exec_count}: {e}')
            cell['outputs'] = [{
                'name': 'stderr',
                'output_type': 'stream',
                'text': [str(e)]
            }]

with open('Meridian_TPRM_AI_Due_Diligence.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print('Successfully executed and pre-rendered Meridian_TPRM_AI_Due_Diligence.ipynb!')
