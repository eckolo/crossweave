extends SceneTree
# 既存OS書体を読み、face指定を実測するだけ。素材・保存を変更しない。
func _initialize():
    var path = OS.get_system_font_path("Yu Gothic UI", 400)
    for mode in ["base", "variation", "cache", "both", "single-header"]:
        var file = FontFile.new()
        if mode == "single-header":
            var data = FileAccess.get_file_as_bytes(path)
            var start = data.decode_u32(16)
            start = ((start & 0xff) << 24) | ((start & 0xff00) << 8) | ((start & 0xff0000) >> 8) | ((start >> 24) & 0xff)
            var count = data[start + 4] * 256 + data[start + 5]
            var header = data.slice(start, start + 12 + 16 * count)
            for i in range(header.size()): data[i] = header[i]
            file.data = data
        else:
            file.load_dynamic_font(path)
        if mode in ["cache", "both"]:
            file.set_face_index(0, 1)
        var font: Font = file
        if mode in ["variation", "both"]:
            var variant = FontVariation.new()
            variant.base_font = file
            variant.variation_face_index = 1
            font = variant
        var faces = []
        for rid in font.get_rids():
            faces.append({"name":TextServerManager.get_primary_interface().font_get_name(rid), "face":TextServerManager.get_primary_interface().font_get_face_index(rid)})
        print(JSON.stringify({"mode":mode,"width":font.get_string_size("次の行動まで", HORIZONTAL_ALIGNMENT_LEFT, -1, 16).x,"faces":faces}))
    quit()
