const iconsUtil = require("extended-ui/utils/icons");

let isBuilded = false;
let contentSTable;
let previewSTable;
let setCategoryNameDialog;

let currentCategory = 0;
let lastCategory = 0;

let schematicButtonSize;
let categoryButtonSize;

let rows;
let columns;

let oldRows;
let oldColumns;
let oldSize;

let hovered = null;

//for mobile version
let lastTaped;
let lastTapTime;

Events.on(ClientLoadEvent, () => {
    Vars.ui.hudGroup.fill(null, t => {
        previewSTable = t.table(Styles.black3).get();
        previewSTable.name = "schematics-preview-table"; // 添加名称标识
        previewSTable.visibility = () => previewTableVisibility();
        t.center();
        t.pack();
    });

    setCategoryNameDialog = new BaseDialog(Core.bundle.get("schematics-table.dialog.change-cathegory-name.title"));
    setCategoryNameDialog.addCloseButton();
    setCategoryNameDialog.cont.pane(table => {
        table.field(null, text => {
            if (!text) return;

            Core.settings.put("category" + currentCategory + "name", text);
            rebuildTable();
        }).growX();
    }).size(320, 320);
});

Events.run(Trigger.update, () => {
    if (!Core.settings.getBool("eui-ShowSchematicsTable", true)) {
        if (isBuilded) {
            clearTable();
        }
        return;
    }

    rows = Core.settings.getInt("eui-SchematicsTableRows", 4);
    columns = Core.settings.getInt("eui-SchematicsTableColumns", 5);
    schematicButtonSize = Core.settings.getInt("eui-SchematicsTableButtonSize", 30);
    categoryButtonSize = schematicButtonSize + 2;

    if (!contentSTable) {
        setMarker();
    }

    if (isRebuildNeeded()) {
        rebuildTable();
    }

    if (hovered && contentSTable.hasMouse()) {
        rebuildPreviewTable();
    } else {
        hovered = null;
    }
});

function showEditSchematicButtonDialog(currentCategory, column, row) {
    const size = Vars.mobile ? 320 : 560
    const schematicString = getSchematicString(currentCategory, column, row);
    const editSchematicButtonDialog = new BaseDialog(Core.bundle.get("schematics-table.dialog.edit-schematic-button.title"));
    editSchematicButtonDialog.addCloseButton();

    addEditImageTable(editSchematicButtonDialog, schematicString + "image", size);
    editSchematicButtonDialog.cont.row();
    addEditSchematicTable(editSchematicButtonDialog, schematicString);

    editSchematicButtonDialog.show();
}

function showEditImageDialog(name) {
    const size = Vars.mobile ? 320 : 640
    const editImageDialog = new BaseDialog(Core.bundle.get("schematics-table.dialog.change-image.title"));
    editImageDialog.addCloseButton();

    addEditImageTable(editImageDialog, name, size);

    editImageDialog.show();
}

function addEditImageTable(dialog, name, size) {
    const iconsAndSprites = [iconsUtil.getIcons(), iconsUtil.getSprites()];

    dialog.cont.pane(table => {
        for (let images of iconsAndSprites) {
            let r = 0;
            table.pane(table => {
                for (let image of Object.entries(images)) {
                    const setted_name = image[0];
                    let imageButton = table.button(image[1], Styles.cleari, () => {
                        Vars.ui.announce(Core.bundle.get("schematics-table.dialog.change-image.setted-announce-text") + " " + setted_name);
                        Core.settings.put(name, setted_name);

                        rebuildTable();
                    }).size(48).pad(4).get();
                    imageButton.resizeImage(48*0.8);

                    if (++r % 8 == 0) table.row();
                }
            }).top();
        }
    }).size(size*2, size);
}

function addEditSchematicTable(dialog, name) {
    let text = Core.bundle.get("schematics-table.dialog.change-schematic.title")
    dialog.cont.pane(table => {
        table.labelWrap(text).growX();
        table.row();
        table.field(Core.settings.getString(name, ""), text => {
            Core.settings.put(name, text);
            rebuildTable();
        }).growX();
    }).size(Core.graphics.getWidth()/2, 80);
}

function setMarker() {
    // 通过名称查找元素而不是使用索引
    let found = false;
    Vars.ui.hudGroup.getChildren().each(elem => {
        if (elem.name === "schematics-preview-table") {
            found = true;
            elem.row();
            contentSTable = elem.table(Styles.black3).top().right().get();
            contentSTable.visibility = () => isBuilded;
        }
    });

    // 如果没有找到，使用备用方案
    if (!found) {
        // 尝试查找其他可能的UI容器
        let overlayContainer = Vars.ui.hudGroup.find(elem =>
            elem.name && elem.name.contains("overlay") ||
            elem.toString().contains("Overlay")
        );

        if (overlayContainer) {
            overlayContainer.row();
            contentSTable = overlayContainer.table(Styles.black3).top().right().get();
        } else {
            // 最后备选方案：直接添加到hudGroup
            contentSTable = Vars.ui.hudGroup.table(Styles.black3).top().right().get();
        }
        contentSTable.visibility = () => isBuilded;
    }
}

function isRebuildNeeded() {
    if (!isBuilded) return true;

    if (!oldColumns || !oldRows || !oldSize) {
        oldRows = rows;
        oldColumns = columns;
        oldSize = schematicButtonSize;
    }
    if (rows != oldRows || columns != oldColumns || oldSize != schematicButtonSize) {
        oldRows = rows;
        oldColumns = columns;
        oldSize = schematicButtonSize;
        return true;
    }

    if (lastCategory != currentCategory) {
        lastCategory = currentCategory;
        return true;
    }

    return false;
}

function rebuildTable() {
    clearTable();
    buildTable();
}

function buildTable() {
    const wrapped = contentSTable.table().margin(3).get();
    let imageButton;

    const categoryButtonsTable = wrapped.table().get();
    for (let i = 0; i < columns; i++) {
        const index = i;
        imageButton = categoryButtonsTable.button(getCategoryImage(index), Styles.clearTogglei, ()=>{
            currentCategory = index;
        }).update(b => {
            b.setChecked(currentCategory == index);
        }).width(categoryButtonSize).height(categoryButtonSize).tooltip(getCategoryTooltip(index)).get();
        imageButton.resizeImage(categoryButtonSize*0.8);
        if (!Vars.mobile) {
            imageButton.clicked(Packages.arc.input.KeyCode.mouseRight, () => showEditImageDialog("category" + index + "image"));
        } else {
            imageButton.clicked(() => {
                if (mobileDoubleTap("category" + index + "image")) {
                    showEditImageDialog("category" + index + "image");
                    // Clicks on label from the phone impossible? so this is here
                    setCategoryNameDialog.show();
                }
            });
        }
    }

    wrapped.row();
    let categoryLabel = wrapped.labelWrap(getCategoryLabelText()).width(categoryButtonSize*columns).padTop(6).padBottom(6).get();
    categoryLabel.setAlignment(Align.center);
    if (!Vars.mobile) {
        categoryLabel.clicked(Packages.arc.input.KeyCode.mouseRight, () => setCategoryNameDialog.show());
    }

    wrapped.row();
    const schematicButtonsTable = wrapped.table().get();
    for (let i = 0; i < rows; i++) {
        const row = i;
        for (let j = 0; j < columns; j++) {
            const column = j;
            const schematic = findSchematic(currentCategory, column, row);

            imageButton = schematicButtonsTable.button(getSchematicImage(column, row), Styles.defaulti, ()=>{
                if (schematic) Vars.control.input.useSchematic(schematic);
            }).update(b => {
                b.setDisabled(false);
            }).width(schematicButtonSize).height(schematicButtonSize).pad(1).tooltip(getSchematicTooltip(schematic)).get();

            imageButton.resizeImage(schematicButtonSize*0.6);
            imageButton.hovered(() => {
                hovered = schematic;
            });
            if (!Vars.mobile) {
                imageButton.clicked(Packages.arc.input.KeyCode.mouseRight, () => showEditSchematicButtonDialog(currentCategory, column, row));
            } else {
                imageButton.clicked(() => {
                    if (mobileDoubleTap(getSchematicString(currentCategory, column, row))) {
                        showEditSchematicButtonDialog(currentCategory, column, row);
                    }
                });
            }
        }
        schematicButtonsTable.row();
    }

    isBuilded = true;
}

function clearTable() {
    if (!isBuilded) return;

    contentSTable.clearChildren();
    isBuilded = false;
}

function rebuildPreviewTable() {
    previewSTable.clearChildren();

    const requirements = hovered.requirements();
    const powerConsumption = hovered.powerConsumption() * 60;
    const powerProduction = hovered.powerProduction() * 60;
    const core = Vars.player.core();

    previewSTable.add(new SchematicsDialog.SchematicImage(hovered)).maxSize(800);
    previewSTable.row();

    previewSTable.table(null, requirementsTable => {
        let i = 0;
        requirements.each((item, amount) => {
            requirementsTable.image(item.uiIcon).left();
            requirementsTable.label(() => {
                if (core == null || Vars.state.rules.infiniteResources || core.items.has(item, amount)) return "[lightgray]" + amount;
                return (core.items.has(item, amount) ? "[lightgray]" : "[scarlet]") + Math.min(core.items.get(item), amount) + "[lightgray]/" + amount;
            }).padLeft(2).left().padRight(4);

            if (++i % 4 == 0) {
                requirementsTable.row();
            }
        });
    });

    previewSTable.row();

    if (powerConsumption || powerProduction) {
        previewSTable.table(null, powerSTable => {

            if (powerProduction) {
                powerSTable.image(Icon.powerSmall).color(Pal.powerLight).padRight(3);
                powerSTable.add("+" + Strings.autoFixed(powerProduction, 2)).color(Pal.powerLight).left();

                if (powerConsumption) {
                    powerSTable.add().width(15);
                }
            }

            if (powerConsumption) {
                powerSTable.image(Icon.powerSmall).color(Pal.remove).padRight(3);
                powerSTable.add("-" + Strings.autoFixed(powerConsumption, 2)).color(Pal.remove).left();
            }
        });
    }
}

function previewTableVisibility() {
    return Core.settings.getBool("eui-ShowSchematicsPreview", true) && Boolean(contentSTable) && contentSTable.visible && Boolean(hovered);
}

function getCategoryTooltip(categoryId) {
    return Core.settings.getString("category" + categoryId + "name", Core.bundle.get("schematics-table.default-cathegory-tooltip"));
}

function getCategoryLabelText() {
    let defaultText;

    if (Vars.mobile) {
        defaultText = Core.bundle.get("schematics-table.default-cathegory-mobile-name");
    } else {
        defaultText = Core.bundle.get("schematics-table.default-cathegory-desktop-name");
    }

    return Core.settings.getString("category" + currentCategory + "name", defaultText);
}

function getCategoryImage(categoryId) {
    return iconsUtil.getByName(Core.settings.getString("category" + categoryId + "image"));
}

function getSchematicImage(column, row) {
    return iconsUtil.getByName(Core.settings.getString(getSchematicString(currentCategory, column, row) + "image"));
}

function getSchematicString(category, column, row) {
    return "schematic" + category + "." + column + "." + row;
}

function getSchematicTooltip(schematic) {
    if (schematic) {
        return Core.bundle.get("schematics-table.use-schematic") + " " + schematic.name();
    } else {
        return Core.bundle.get("schematics-table.default-cathegory-desktop-name");
    }
}

function findSchematic(category, column, row) {
    let name = Core.settings.getString(getSchematicString(category, column, row));
    let schem = null;
	Vars.schematics.all().each((s) => {
		if(s.name() == name) {
			schem = s;
		}
	});
    return schem;
}

function mobileDoubleTap(name) {
    if (lastTaped == name && Date.now() - lastTapTime < 250) {
        return true;
    } else {
        lastTaped = name;
        lastTapTime = Date.now();
        return false;
    }
}