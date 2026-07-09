const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class MockModel {
  constructor(collectionName) {
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  // Wraps an item object to mimic Mongoose document methods, e.g. .save()
  _wrapItem(item) {
    if (!item) return null;
    const self = this;
    return {
      ...item,
      save: async function() {
        const currentItems = self._read();
        const index = currentItems.findIndex(i => i._id === this._id);
        this.updatedAt = new Date().toISOString();
        
        // Clean out helper methods before saving to JSON file
        const dbWriteItem = { ...this };
        delete dbWriteItem.save;

        if (index !== -1) {
          currentItems[index] = dbWriteItem;
        } else {
          currentItems.push(dbWriteItem);
        }
        
        self._write(currentItems);
        return this;
      }
    };
  }

  async find(query = {}) {
    const items = this._read();
    return items
      .filter(item => this._matchQuery(item, query))
      .map(item => this._wrapItem(item));
  }

  async findOne(query = {}) {
    const items = this._read();
    const item = items.find(item => this._matchQuery(item, query));
    return item ? this._wrapItem(item) : null;
  }

  async findById(id) {
    const items = this._read();
    const item = items.find(item => item._id === id || item.id === id);
    return item ? this._wrapItem(item) : null;
  }

  async create(data) {
    const newItem = {
      _id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    const wrapped = this._wrapItem(newItem);
    await wrapped.save();
    return wrapped;
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const items = this._read();
    const index = items.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;

    let updatedItem = { ...items[index] };
    
    // Support mongoose update operators like $set or regular updates
    const fieldsToUpdate = update.$set ? update.$set : update;
    for (const key in fieldsToUpdate) {
      updatedItem[key] = fieldsToUpdate[key];
    }

    const wrapped = this._wrapItem(updatedItem);
    await wrapped.save();
    return wrapped;
  }

  async findByIdAndDelete(id) {
    const items = this._read();
    const item = items.find(i => i._id === id || i.id === id);
    if (!item) return null;
    const filtered = items.filter(i => i._id !== id && i.id !== id);
    this._write(filtered);
    return item;
  }

  async deleteOne(query = {}) {
    const items = this._read();
    const index = items.findIndex(item => this._matchQuery(item, query));
    if (index === -1) return { deletedCount: 0 };
    items.splice(index, 1);
    this._write(items);
    return { deletedCount: 1 };
  }

  async deleteMany(query = {}) {
    const items = this._read();
    const remaining = items.filter(item => !this._matchQuery(item, query));
    const deletedCount = items.length - remaining.length;
    this._write(remaining);
    return { deletedCount };
  }

  async countDocuments(query = {}) {
    const items = this._read();
    return items.filter(item => this._matchQuery(item, query)).length;
  }

  _matchQuery(item, query) {
    for (const key in query) {
      let queryVal = query[key];
      let itemVal = item[key];
      
      // Handle simple comparisons
      if (typeof queryVal === 'object' && queryVal !== null) {
        if ('$ne' in queryVal) {
          if (itemVal === queryVal.$ne) return false;
        } else if ('$in' in queryVal) {
          if (!Array.isArray(queryVal.$in) || !queryVal.$in.includes(itemVal)) return false;
        } else {
          // Fallback to strict comparison for other objects
          if (JSON.stringify(itemVal) !== JSON.stringify(queryVal)) return false;
        }
      } else {
        if (itemVal !== queryVal) return false;
      }
    }
    return true;
  }
}

// Export models mapper
const models = {};
const getMockModel = (name) => {
  if (!models[name]) {
    models[name] = new MockModel(name.toLowerCase() + 's');
  }
  return models[name];
};

module.exports = { getMockModel };
