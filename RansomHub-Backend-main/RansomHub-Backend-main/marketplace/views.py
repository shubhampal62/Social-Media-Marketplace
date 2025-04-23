from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Category, Item, Order, Review, Wishlist
from .serializers import (
    CategorySerializer,
    ItemCreateUpdateSerializer,
    ItemDetailSerializer,
    ItemListSerializer,
    OrderSerializer,
    ReviewSerializer,
    WishlistSerializer,
)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        if hasattr(obj, "seller"):
            return obj.seller == request.user
        elif hasattr(obj, "user"):
            return obj.user == request.user
        return False


class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for marketplace categories
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]

    def get_permissions(self):
        """
        Allow anyone to list and retrieve categories
        """
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return super().get_permissions()


class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for marketplace items
    """

    queryset = Item.objects.all()
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "category__name"]
    ordering_fields = ["created_at", "price"]

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action
        """
        if self.action == "retrieve":
            return ItemDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return ItemCreateUpdateSerializer
        return ItemListSerializer

    def get_queryset(self):
        """
        Filter items based on query parameters
        """
        queryset = Item.objects.all()

        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__slug=category)

        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by price range
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        # Filter by seller
        seller = self.request.query_params.get("seller")
        if seller:
            queryset = queryset.filter(seller__username=seller)

        return queryset

    @action(detail=False, methods=["get"])
    def my_items(self, request):
        """
        Return items listed by the current user
        """
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        items = Item.objects.filter(seller=request.user)
        serializer = ItemListSerializer(items, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def mark_as_sold(self, request, pk=None):
        """
        Mark an item as sold
        """
        item = self.get_object()

        # Check if user is the seller
        if item.seller != request.user:
            return Response({"detail": "You can only mark your own items as sold"}, status=status.HTTP_403_FORBIDDEN)

        # Check if item is already sold
        if item.status == "sold":
            return Response({"detail": "Item is already marked as sold"}, status=status.HTTP_400_BAD_REQUEST)

        # Mark as sold
        item.status = "sold"
        item.save()

        return Response({"detail": "Item marked as sold"})


class OrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for marketplace orders
    """

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return orders for the current user (as buyer or seller)
        """
        user = self.request.user
        return Order.objects.filter(Q(buyer=user) | Q(seller=user))

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """
        Complete an order (seller only)
        """
        order = self.get_object()

        # Check if user is the seller
        if order.seller != request.user:
            return Response({"detail": "Only the seller can complete this order"}, status=status.HTTP_403_FORBIDDEN)

        # Check if order is already completed or cancelled
        if order.status != "pending":
            return Response(
                {"detail": f"Order cannot be completed (current status: {order.status})"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Complete the order
        order.status = "completed"
        order.save()

        # Mark the item as sold
        order.item.status = "sold"
        order.item.save()

        return Response({"detail": "Order completed successfully"})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """
        Cancel an order (buyer or seller)
        """
        order = self.get_object()

        # Check if user is the buyer or seller
        if order.buyer != request.user and order.seller != request.user:
            return Response({"detail": "You cannot cancel this order"}, status=status.HTTP_403_FORBIDDEN)

        # Check if order is already completed or cancelled
        if order.status != "pending":
            return Response(
                {"detail": f"Order cannot be cancelled (current status: {order.status})"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Cancel the order
        order.status = "cancelled"
        order.save()

        # Mark the item as available again
        order.item.status = "available"
        order.item.save()

        return Response({"detail": "Order cancelled successfully"})


class ReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for marketplace reviews
    """

    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return reviews for the current user or for a specific user
        """
        queryset = Review.objects.all()

        # Filter by user
        user_param = self.request.query_params.get("user")
        if user_param:
            queryset = queryset.filter(reviewed_user__username=user_param)

        return queryset

    @action(detail=False, methods=["get"])
    def my_reviews(self, request):
        """
        Return reviews for the current user
        """
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        reviews = Review.objects.filter(reviewed_user=request.user)
        serializer = ReviewSerializer(reviews, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def user_rating(self, request):
        """
        Return average rating for a user
        """
        username = request.query_params.get("username")
        if not username:
            return Response({"detail": "Username parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate average rating
        avg_rating = Review.objects.filter(reviewed_user__username=username).aggregate(Avg("rating"))

        return Response(
            {
                "username": username,
                "average_rating": avg_rating["rating__avg"] or 0,
                "review_count": Review.objects.filter(reviewed_user__username=username).count(),
            }
        )


class WishlistViewSet(viewsets.ModelViewSet):
    """
    API endpoint for user wishlists
    """

    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return wishlist items for the current user
        """
        return Wishlist.objects.filter(user=self.request.user)

    @action(detail=False, methods=["delete"])
    def remove_item(self, request):
        """
        Remove an item from the wishlist
        """
        item_id = request.query_params.get("item_id")
        if not item_id:
            return Response({"detail": "Item ID parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find the wishlist entry
        wishlist_item = get_object_or_404(Wishlist, user=request.user, item__id=item_id)

        # Delete it
        wishlist_item.delete()

        return Response({"detail": "Item removed from wishlist"}, status=status.HTTP_204_NO_CONTENT)
