from django.contrib import admin

from .models import Category, Item, ItemImage, Order, Review, Wishlist


class ItemImageInline(admin.TabularInline):
    model = ItemImage
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "created_at")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("title", "price", "category", "seller", "status", "created_at")
    list_filter = ("status", "category", "created_at")
    search_fields = ("title", "description", "seller__username", "seller__email")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ItemImageInline]
    date_hierarchy = "created_at"


@admin.register(ItemImage)
class ItemImageAdmin(admin.ModelAdmin):
    list_display = ("item", "is_primary", "created_at")
    list_filter = ("is_primary", "created_at")
    search_fields = ("item__title",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "item", "buyer", "seller", "status", "purchase_price", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("item__title", "buyer__username", "seller__username")
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("order", "reviewer", "reviewed_user", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("reviewer__username", "reviewed_user__username", "comment")
    date_hierarchy = "created_at"


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("user", "item", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "item__title")
