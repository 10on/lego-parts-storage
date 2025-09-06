#!/usr/bin/env node

/**
 * Script to process BrickLink CSV data into optimized JSON
 * Run with: node scripts/process-bricklink-data.js
 */

const fs = require('fs');
const path = require('path');

// Пути к файлам
const inputDir = path.join(__dirname, '../data/bricklink');
const outputDir = path.join(__dirname, '../data/bricklink');

// Обработка файла деталей
function processParts() {
    console.log('🔄 Processing parts data...');
    
    const partsFile = path.join(inputDir, 'parts.csv');
    const content = fs.readFileSync(partsFile, 'utf8');
    const lines = content.split('\n');
    
    const parts = [];
    const categories = new Set();
    
    for (let i = 3; i < lines.length; i++) { // Пропускаем заголовок
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split('\t');
        if (values.length < 4) continue;
        
        const part = {
            catId: values[0] || '',
            cat: values[1] || '',
            id: values[2] || '',
            name: values[3] || ''
        };
        
        // Фильтруем ненужные категории
        if (part.cat === 'Sticker Sheet' || part.cat === 'Homemaker' || !part.id || !part.name) {
            continue;
        }
        
        // Фильтруем слишком специфичные детали
        if (part.name.toLowerCase().includes('pattern') || 
            part.name.toLowerCase().includes('print') ||
            part.name.toLowerCase().includes('sticker')) {
            continue;
        }
        
        categories.add(part.cat);
        parts.push(part);
    }
    
    console.log(`📦 Processed ${parts.length} parts from ${categories.size} categories`);
    
    // Сохраняем оптимизированные данные
    fs.writeFileSync(
        path.join(outputDir, 'parts.json'), 
        JSON.stringify(parts, null, 2)
    );
    
    // Сохраняем список категорий
    fs.writeFileSync(
        path.join(outputDir, 'categories.json'), 
        JSON.stringify([...categories].sort(), null, 2)
    );
    
    return parts.length;
}

// Обработка файла цветов
function processColors() {
    console.log('🔄 Processing colors data...');
    
    const colorsFile = path.join(inputDir, 'colors.csv');
    const content = fs.readFileSync(colorsFile, 'utf8');
    const lines = content.split('\n');
    
    const colors = [];
    
    for (let i = 3; i < lines.length; i++) { // Пропускаем заголовок
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split('\t');
        if (values.length < 5) continue;
        
        const color = {
            id: values[0] || '',
            name: values[1] || '',
            rgb: values[2] || '',
            type: values[3] || '',
            parts: parseInt(values[4]) || 0
        };
        
        // Фильтруем специальные цвета
        if (color.name === '(Not Applicable)' || !color.name || !color.rgb) {
            continue;
        }
        
        colors.push(color);
    }
    
    // Сортируем по популярности
    colors.sort((a, b) => b.parts - a.parts);
    
    console.log(`🎨 Processed ${colors.length} colors`);
    
    // Сохраняем данные
    fs.writeFileSync(
        path.join(outputDir, 'colors.json'), 
        JSON.stringify(colors, null, 2)
    );
    
    return colors.length;
}

// Главная функция
function main() {
    try {
        console.log('🚀 Starting BrickLink data processing...');
        
        const partsCount = processParts();
        const colorsCount = processColors();
        
        console.log('✅ Processing complete!');
        console.log(`📊 Summary: ${partsCount} parts, ${colorsCount} colors`);
        console.log('💾 Generated files:');
        console.log('  - data/bricklink/parts.json');
        console.log('  - data/bricklink/colors.json');
        console.log('  - data/bricklink/categories.json');
        
    } catch (error) {
        console.error('❌ Error processing data:', error);
        process.exit(1);
    }
}

// Запуск если это основной модуль
if (require.main === module) {
    main();
}

module.exports = { processParts, processColors };
