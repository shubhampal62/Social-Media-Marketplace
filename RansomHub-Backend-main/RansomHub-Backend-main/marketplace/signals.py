from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import ItemImage, Order, Review


@receiver(post_save, sender=Order)
def update_item_status_on_order_change(sender, instance, created, **kwargs):
    """
    Update item status when an order is completed or cancelled.
    Items remain available until an order is completed.
    """
    # We don't change item status when an order is created
    # Items remain available for others to purchase
    
    # Only update status when an existing order's status changes
    if instance.status == "completed":
        # Mark the item as sold when the order is completed
        instance.item.status = "sold"
        instance.item.save()
    elif instance.status == "cancelled":
        # Ensure the item is available when the order is cancelled
        # This is useful if a previous version might have set it to reserved
        instance.item.status = "available"
        instance.item.save()


@receiver(post_save, sender=ItemImage)
def ensure_one_primary_image(sender, instance, created, **kwargs):
    """
    Ensure that only one image is marked as primary for an item
    """
    if instance.is_primary:
        # If this image is primary, make sure no other images for this item are primary
        ItemImage.objects.filter(item=instance.item, is_primary=True).exclude(id=instance.id).update(is_primary=False)
    else:
        # If no primary image exists for this item, make this one primary
        if not ItemImage.objects.filter(item=instance.item, is_primary=True).exists():
            instance.is_primary = True
            instance.save(update_fields=["is_primary"])


@receiver(post_delete, sender=ItemImage)
def update_primary_image_on_delete(sender, instance, **kwargs):
    """
    If the primary image is deleted, make another image primary
    """
    if instance.is_primary:
        # Find another image for this item and make it primary
        other_image = ItemImage.objects.filter(item=instance.item).first()
        if other_image:
            other_image.is_primary = True
            other_image.save(update_fields=["is_primary"])
