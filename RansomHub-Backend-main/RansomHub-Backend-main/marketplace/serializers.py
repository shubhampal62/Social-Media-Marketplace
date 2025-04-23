from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Category, Item, ItemImage, Order, Review, Wishlist

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user information in marketplace"""

    class Meta:
        model = User
        fields = ["id", "username", "email", "profile_picture"]


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for marketplace categories"""

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description"]
        read_only_fields = ["slug"]


class ItemImageSerializer(serializers.ModelSerializer):
    """Serializer for item images"""

    class Meta:
        model = ItemImage
        fields = ["id", "image", "is_primary"]


class ItemListSerializer(serializers.ModelSerializer):
    """Serializer for listing marketplace items"""

    category_name = serializers.CharField(source="category.name", read_only=True)
    seller = UserSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            "id",
            "title",
            "slug",
            "price",
            "category",
            "category_name",
            "seller",
            "status",
            "created_at",
            "primary_image",
        ]
        read_only_fields = ["slug", "seller"]

    def get_primary_image(self, obj):
        """Get the primary image for an item"""
        primary_image = obj.images.filter(is_primary=True).first()
        if not primary_image:
            primary_image = obj.images.first()

        if primary_image:
            return ItemImageSerializer(primary_image).data
        return None


class ItemDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed marketplace item view"""

    category_name = serializers.CharField(source="category.name", read_only=True)
    seller = UserSerializer(read_only=True)
    images = ItemImageSerializer(many=True, read_only=True)

    class Meta:
        model = Item
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "price",
            "category",
            "category_name",
            "seller",
            "status",
            "created_at",
            "updated_at",
            "images",
        ]
        read_only_fields = ["slug", "seller"]


class ItemCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating marketplace items"""

    images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False,
    )
    primary_image_index = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Item
        fields = ["title", "description", "price", "category", "status", "images", "primary_image_index"]

    def create(self, validated_data):
        """Create a new item with images"""
        images_data = validated_data.pop("images", [])
        primary_image_index = validated_data.pop("primary_image_index", 0)

        # Set the seller to the current user
        validated_data["seller"] = self.context["request"].user

        # Create the item
        item = Item.objects.create(**validated_data)

        # Create the images
        for i, image_data in enumerate(images_data):
            ItemImage.objects.create(item=item, image=image_data, is_primary=(i == primary_image_index))

        return item

    def update(self, instance, validated_data):
        """Update an existing item with images"""
        images_data = validated_data.pop("images", None)
        primary_image_index = validated_data.pop("primary_image_index", None)

        # Update the item fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If new images are provided, handle them
        if images_data is not None:
            # Delete existing images if new ones are provided
            instance.images.all().delete()

            # Create new images
            for i, image_data in enumerate(images_data):
                ItemImage.objects.create(
                    item=instance,
                    image=image_data,
                    is_primary=(i == primary_image_index if primary_image_index is not None else False),
                )
        # If only primary image index is updated
        elif primary_image_index is not None:
            # Reset all images to non-primary
            instance.images.all().update(is_primary=False)

            # Set the new primary image
            images = list(instance.images.all())
            if 0 <= primary_image_index < len(images):
                images[primary_image_index].is_primary = True
                images[primary_image_index].save()

        return instance


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for marketplace orders"""

    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)
    item = ItemListSerializer(read_only=True)
    item_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Order
        fields = ["id", "item", "item_id", "buyer", "seller", "status", "purchase_price", "created_at", "updated_at"]
        read_only_fields = ["id", "buyer", "seller", "purchase_price"]

    def create(self, validated_data):
        """Create a new order"""
        item_id = validated_data.pop("item_id")
        user = self.context["request"].user

        # Get the item
        try:
            item = Item.objects.get(id=item_id, status="available")
        except Item.DoesNotExist:
            raise serializers.ValidationError({"item_id": "Item not found or not available"})

        # Check if user is trying to buy their own item
        if item.seller == user:
            raise serializers.ValidationError({"item_id": "You cannot buy your own item"})

        # Create the order
        order = Order.objects.create(
            item=item, buyer=user, seller=item.seller, purchase_price=item.price, status="pending"
        )

        return order


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for marketplace reviews"""

    reviewer = UserSerializer(read_only=True)
    reviewed_user = UserSerializer(read_only=True)
    order_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Review
        fields = ["id", "order_id", "reviewer", "reviewed_user", "rating", "comment", "created_at"]
        read_only_fields = ["id", "reviewer", "reviewed_user"]

    def create(self, validated_data):
        """Create a new review"""
        order_id = validated_data.pop("order_id")
        user = self.context["request"].user

        # Get the order
        try:
            order = Order.objects.get(id=order_id, status="completed")
        except Order.DoesNotExist:
            raise serializers.ValidationError({"order_id": "Order not found or not completed"})

        # Check if user is the buyer or seller
        if order.buyer != user and order.seller != user:
            raise serializers.ValidationError({"order_id": "You can only review orders you're involved in"})

        # Check if review already exists
        if hasattr(order, "review"):
            raise serializers.ValidationError({"order_id": "Review already exists for this order"})

        # Set reviewer and reviewed user
        reviewer = user
        reviewed_user = order.seller if user == order.buyer else order.buyer

        # Create the review
        review = Review.objects.create(
            order=order,
            reviewer=reviewer,
            reviewed_user=reviewed_user,
            rating=validated_data["rating"],
            comment=validated_data["comment"],
        )

        return review


class WishlistSerializer(serializers.ModelSerializer):
    """Serializer for user wishlists"""

    user = UserSerializer(read_only=True)
    item = ItemListSerializer(read_only=True)
    item_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "user", "item", "item_id", "created_at"]
        read_only_fields = ["id", "user"]

    def create(self, validated_data):
        """Add an item to wishlist"""
        item_id = validated_data.pop("item_id")
        user = self.context["request"].user

        # Get the item
        try:
            item = Item.objects.get(id=item_id)
        except Item.DoesNotExist:
            raise serializers.ValidationError({"item_id": "Item not found"})

        # Check if item is already in wishlist
        if Wishlist.objects.filter(user=user, item=item).exists():
            raise serializers.ValidationError({"item_id": "Item already in wishlist"})

        # Create the wishlist entry
        wishlist = Wishlist.objects.create(user=user, item=item)

        return wishlist
