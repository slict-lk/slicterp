import re, json

with open('/mnt/user-data/uploads/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

model_blocks = re.findall(r'model\s+(\w+)\s*\{([^}]*)\}', content, re.DOTALL)

dictionary = {}
for name, body in model_blocks:
    fields = []
    has_tenant = False
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith('@@') or line.startswith('//'):
            continue
        m = re.match(r'(\w+)\s+([\w\[\]\?]+)', line)
        if m:
            fname, ftype = m.group(1), m.group(2)
            fields.append({"name": fname, "type": ftype})
            if fname == 'tenantId':
                has_tenant = True
    dictionary[name] = {"columns": fields, "hasTenantId": has_tenant}

with open('/home/claude/table_dictionary.json', 'w') as f:
    json.dump(dictionary, f, indent=2)

total = len(dictionary)
with_tenant = sum(1 for v in dictionary.values() if v['hasTenantId'])
print(f"Total models: {total}, with tenantId: {with_tenant}, without tenantId: {total - with_tenant}")
