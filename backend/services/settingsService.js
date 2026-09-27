const Setting = require("../models/Setting");

/* ===================================
   PLATFORM SETTING DEFINITIONS
=================================== */

const SETTING_DEFINITIONS = {
  maintenanceMode: {
    defaultValue: false,
    type: "boolean",
    description: "Temporarily place PrepVanta in maintenance mode.",
  },

  registrationEnabled: {
    defaultValue: true,
    type: "boolean",
    description: "Allow new users to register for PrepVanta.",
  },

  compilerEnabled: {
    defaultValue: true,
    type: "boolean",
    description: "Allow users to execute code using the PrepVanta compiler.",
  },

  supportEnabled: {
    defaultValue: true,
    type: "boolean",
    description: "Allow users to create new help desk tickets.",
  },

  userSearchEnabled: {
    defaultValue: true,
    type: "boolean",
    description: "Allow users to search for other PrepVanta users.",
  },

  announcementEnabled: {
    defaultValue: false,
    type: "boolean",
    description: "Display the platform announcement to users.",
  },

  announcementMessage: {
    defaultValue: "",
    type: "string",
    description: "Announcement message displayed across PrepVanta.",
  },
};

/* ===================================
   VALIDATION
=================================== */

function validateSettingValue(key, value) {
  const definition = SETTING_DEFINITIONS[key];

  if (!definition) {
    throw new Error("Unknown platform setting");
  }

  if (definition.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(`${key} must be a boolean`);
    }

    return value;
  }

  if (definition.type === "string") {
    if (typeof value !== "string") {
      throw new Error(`${key} must be a string`);
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length > 500) {
      throw new Error(`${key} cannot exceed 500 characters`);
    }

    return trimmedValue;
  }

  throw new Error("Unsupported setting type");
}

/* ===================================
   INITIALIZE DEFAULT SETTINGS
=================================== */

async function initializeSettings() {
  const operations = Object.entries(SETTING_DEFINITIONS).map(
    ([key, definition]) => ({
      updateOne: {
        filter: { key },

        update: {
          $setOnInsert: {
            key,
            value: definition.defaultValue,
            description: definition.description,
          },
        },

        upsert: true,
      },
    }),
  );

  if (operations.length) {
    await Setting.bulkWrite(operations);
  }
}

/* ===================================
   GET ALL SETTINGS
=================================== */

async function getAllSettings() {
  await initializeSettings();

  const settings = await Setting.find({
    key: {
      $in: Object.keys(SETTING_DEFINITIONS),
    },
  })
    .sort({ key: 1 })
    .lean();

  return settings;
}

/* ===================================
   GET ONE SETTING
=================================== */

async function getSetting(key) {
  const definition = SETTING_DEFINITIONS[key];

  if (!definition) {
    return null;
  }

  await Setting.updateOne(
    { key },

    {
      $setOnInsert: {
        key,
        value: definition.defaultValue,
        description: definition.description,
      },
    },

    {
      upsert: true,
    },
  );

  return Setting.findOne({ key }).lean();
}

/* ===================================
   GET SETTING VALUE
=================================== */

async function getSettingValue(key) {
  const definition = SETTING_DEFINITIONS[key];

  if (!definition) {
    return null;
  }

  const setting = await getSetting(key);

  if (!setting) {
    return definition.defaultValue;
  }

  return setting.value;
}

/* ===================================
   UPDATE ONE SETTING
=================================== */

async function updateSetting(key, value, userId) {
  const definition = SETTING_DEFINITIONS[key];

  if (!definition) {
    throw new Error("Unknown platform setting");
  }

  const validatedValue = validateSettingValue(key, value);

  const setting = await Setting.findOneAndUpdate(
    { key },

    {
      $set: {
        value: validatedValue,
        description: definition.description,
        updatedBy: userId,
      },
    },

    {
      new: true,
      upsert: true,
      runValidators: true,
    },
  ).lean();

  return setting;
}

/* ===================================
   UPDATE MULTIPLE SETTINGS
=================================== */

async function updateSettings(updates, userId) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Settings must be provided as an object");
  }

  const entries = Object.entries(updates);

  if (!entries.length) {
    throw new Error("No settings were provided");
  }

  /*
       Validate everything before changing MongoDB.
       This prevents a partially updated settings set
       when one supplied value is invalid.
    */
  const validatedUpdates = entries.map(([key, value]) => ({
    key,
    value: validateSettingValue(key, value),
  }));

  const updatedSettings = [];

  for (const update of validatedUpdates) {
    const setting = await updateSetting(update.key, update.value, userId);

    updatedSettings.push(setting);
  }

  return updatedSettings;
}

module.exports = {
  SETTING_DEFINITIONS,
  initializeSettings,
  getAllSettings,
  getSetting,
  getSettingValue,
  updateSetting,
  updateSettings,
};
