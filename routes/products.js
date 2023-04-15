const express = require("express");
const router = express.Router();
const { checkIfAuthenticated } = require('../middlewares');

const { Product, Category, Tag } = require('../models');

const { bootstrapField, createProductForm } = require('../forms');


router.get('/', checkIfAuthenticated, async (req, res) => {
    let products = await Product.collection().fetch({
        withRelated: ['category', 'tags']
    });
    res.render('products/index', {
        'products': products.toJSON()
    })
})

router.get('/create', checkIfAuthenticated, async (req, res) => {
    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })

    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')]);

    const productForm = createProductForm(allCategories, allTags);
    res.render('products/create', {
        'form': productForm.toHTML(bootstrapField),
        cloudinaryName: process.env.CLOUDINARY_NAME,
        cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
        cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    })
    
})

router.post('/create', checkIfAuthenticated, async (req, res) => {

    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')]);
    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })
    const productForm = createProductForm(allCategories,allTags);
    productForm.handle(req, {
        'success': async (form) => {
            // const product = new Product();
            let { tags, ...productData } = form.data;
            const product = new Product(productData);

            await product.save();
            if (tags) {
                await product.tags().attach(tags.split(","));
            }
            req.flash("success_messages", `New Product ${product.get('name')} has been create` )
            res.redirect('/products');

        },
        'error': async (form) => {
            res.render('products/create', {
                'form': form.toHTML(bootstrapField)
            })
        }
    })
})

router.get('/:product_id/update', checkIfAuthenticated, async (req, res) => {
    // retrieve the product
    const productId = req.params.product_id
    const product = await Product.where({
        'id': productId
    }).fetch({
        require: true,
        withRelated: ['tags']
    });
    // fetch all the tags
    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')]);

    // fetch all the categories
    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })
    const productForm = createProductForm(allCategories, allTags);

    // fill in the existing values
    productForm.fields.name.value = product.get('name');
    productForm.fields.cost.value = product.get('cost');
    productForm.fields.description.value = product.get('description');
    productForm.fields.category_id.value = product.get('category_id');
    // 1 - set the image url in the product form
    productForm.fields.image_url.value = product.get('image_url');

    // fill in the multi-select for the tags
    let selectedTags = await product.related('tags').pluck('id');
    productForm.fields.tags.value = selectedTags;

    res.render('products/update', {
        'form': productForm.toHTML(bootstrapField),
        'product': product.toJSON(),
        // 2 - send to the HBS file the cloudinary information
        cloudinaryName: process.env.CLOUDINARY_NAME,
        cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
        cloudinaryPreset: process.env.CLOUDINARY_UPLOAD_PRESET
    })

})

router.post('/:product_id/update', async (req, res) => {

    // fetch all the tags
    const allTags = await Tag.fetchAll().map(tag => [tag.get('id'), tag.get('name')]);

    const allCategories = await Category.fetchAll().map((category) => {
        return [category.get('id'), category.get('name')];
    })

    // fetch the product that we want to update
    const product = await Product.where({
        'id': req.params.product_id
    }).fetch({
        require: true,
        withRelated: ['tags']
    });

    // process the form
    const productForm = createProductForm(allCategories,allTags);
    productForm.handle(req, {
        success: async (form) => {
            let { tags, ...productData } = form.data
            product.set(productData);
            product.save();

            // update the tags

            let tagIds = tags.split(',');
            let existingTagIds = await product.related('tags').pluck('id');

            // remove all the tags that aren't selected anymore
            let toRemove = existingTagIds.filter(id => tagIds.includes(id) === false);
            await product.tags().detach(toRemove);

            // add in all the tags selected in the form
            await product.tags().attach(tagIds);
            res.redirect('/products');
        },
        error: async (form) => {
            res.render('products/update', {
                form: form.toHTML(bootstrapField),
                product: product.toJSON()
            });
        }
    });
});

router.get('/:product_id/delete', async (req, res) => {
    // fetch the product that we want to delete
    const product = await Product.where({
        'id': req.params.product_id
    }).fetch({
        require: true
    });

    res.render('products/delete', {
        'product': product.toJSON()
    })

});

router.post('/:product_id/delete', async (req, res) => {
    // fetch the product that we want to delete
    const product = await Product.where({
        'id': req.params.product_id
    }).fetch({
        require: true
    });
    await product.destroy();
    res.redirect('/products')
})


module.exports = router;